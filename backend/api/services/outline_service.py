"""Server-mediated client for the Outline knowledge base API.

Design constraints (see docs/DECISIONS.md Q-LEARN-06 / Q-LEARN-10):
- Server-mediated: only the backend talks to Outline; the API token never leaves
  the server. The frontend consumes normalized data returned by our own endpoints.
- Synchronous blocking (no Celery in MVP). Callers translate the exceptions raised
  here into HTTP status codes; on Outline failure the caller preserves old content.

HTTP is done with the standard-library ``urllib`` to match the existing external
integration (``auth_app/services/sso_service.py``); ``requests`` is not a project
dependency.

Outline is an RPC-style API: every call is ``POST {base}/api/<method>`` with a JSON
body and ``Authorization: Bearer <token>``. Verified endpoints used here:
- ``collections.list``  -> ``{data: [{id, name, ...}], pagination: {offset, limit, total}}``
- ``documents.list``    -> docs include ``id, title, url, urlId, revision, collectionId,
                            text, updatedAt`` + same pagination shape.
- ``documents.info``    -> single document with the same fields.
Document ``url`` is relative (e.g. ``/doc/tools-xCsVaoS7os``); the full viewer URL is
``base_url + url``.
"""

import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from api.utils import get_config


class OutlineConfigError(Exception):
    """Outline integration is disabled or misconfigured (maps to HTTP 409/400)."""


class OutlineUnavailableError(Exception):
    """Outline is unreachable, timed out, or returned an error (maps to HTTP 503)."""


class OutlineNotFoundError(Exception):
    """The requested Outline resource does not exist (maps to HTTP 404)."""


class OutlineService:
    """Normalizing client for the Outline REST API."""

    REQUEST_TIMEOUT = 15
    # Some Outline deployments sit behind a WAF (e.g. Cloudflare) that blocks the
    # default ``Python-urllib`` User-Agent (HTTP 403, error code 1010). Send a
    # neutral product UA so requests are not filtered.
    USER_AGENT = 'ILS-Outline-Sync/1.0'

    # ── configuration ────────────────────────────────────────────────────────
    @staticmethod
    def _get_config() -> dict:
        """Read and validate Outline config from system_config.

        Raises OutlineConfigError when disabled or missing url/token.
        """
        if not get_config('outline.enabled', False):
            raise OutlineConfigError('Outline integration is disabled.')

        base_url = (get_config('outline.url', '') or '').rstrip('/')
        api_token = (get_config('outline.api_token', '') or '').strip()

        if not base_url:
            raise OutlineConfigError('Missing outline.url configuration.')
        if not api_token:
            raise OutlineConfigError('Missing outline.api_token configuration.')

        return {'base_url': base_url, 'api_token': api_token}

    # ── low-level transport ──────────────────────────────────────────────────
    @classmethod
    def _post(cls, method: str, body: dict) -> dict:
        """POST {base}/api/<method> with Bearer auth; return parsed ``data`` envelope.

        Translates transport/HTTP failures into the service exception hierarchy:
        - HTTP 404                          -> OutlineNotFoundError
        - other HTTP / network / timeout    -> OutlineUnavailableError
        - invalid JSON                      -> OutlineUnavailableError
        """
        config = cls._get_config()
        url = f"{config['base_url']}/api/{method}"
        payload = json.dumps(body or {}).encode('utf-8')
        request = Request(
            url,
            data=payload,
            headers={
                'Authorization': f"Bearer {config['api_token']}",
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': cls.USER_AGENT,
            },
            method='POST',
        )

        try:
            with urlopen(request, timeout=cls.REQUEST_TIMEOUT) as response:
                raw = response.read().decode('utf-8')
        except HTTPError as exc:
            if exc.code == 404:
                raise OutlineNotFoundError('Outline resource not found.') from exc
            raise OutlineUnavailableError(
                f'Outline returned an error (HTTP {exc.code}).'
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise OutlineUnavailableError('Failed to reach Outline.') from exc

        try:
            parsed = json.loads(raw)
        except ValueError as exc:
            raise OutlineUnavailableError('Outline returned invalid JSON.') from exc

        return parsed

    # ── normalization helpers ────────────────────────────────────────────────
    @staticmethod
    def _pagination(parsed: dict, offset: int, limit: int) -> dict:
        pagination = parsed.get('pagination') or {}
        return {
            'total': pagination.get('total', len(parsed.get('data') or [])),
            'offset': pagination.get('offset', offset),
            'limit': pagination.get('limit', limit),
        }

    @classmethod
    def _build_doc_url(cls, relative_url: str) -> str:
        """Return the absolute viewer URL for a document's relative ``url``."""
        base_url = cls._get_config()['base_url']
        relative = relative_url or ''
        if relative and not relative.startswith('/'):
            relative = f'/{relative}'
        return f'{base_url}{relative}'

    @staticmethod
    def _normalize_document(doc: dict, base_url: str) -> dict:
        relative = doc.get('url') or ''
        if relative and not relative.startswith('/'):
            relative = f'/{relative}'
        return {
            'id': doc.get('id'),
            'title': doc.get('title') or '',
            'url': f'{base_url}{relative}',
            'revision': doc.get('revision'),
            'updated_at': doc.get('updatedAt'),
            'collection_id': doc.get('collectionId'),
        }

    # ── public API ───────────────────────────────────────────────────────────
    @classmethod
    def list_collections(cls, offset: int = 0, limit: int = 25) -> dict:
        parsed = cls._post('collections.list', {'offset': offset, 'limit': limit})
        items = [
            {'id': c.get('id'), 'name': c.get('name') or ''}
            for c in (parsed.get('data') or [])
        ]
        return {'items': items, **cls._pagination(parsed, offset, limit)}

    @classmethod
    def list_documents(cls, collection_id: str = None, offset: int = 0, limit: int = 25) -> dict:
        base_url = cls._get_config()['base_url']
        body = {'offset': offset, 'limit': limit}
        if collection_id:
            body['collectionId'] = collection_id
        parsed = cls._post('documents.list', body)
        # ``text`` (full markdown) is intentionally dropped from the picker payload.
        items = [
            cls._normalize_document(doc, base_url)
            for doc in (parsed.get('data') or [])
        ]
        return {'items': items, **cls._pagination(parsed, offset, limit)}

    @classmethod
    def get_document(cls, doc_id: str) -> dict:
        """Fetch a single document including its markdown ``text``."""
        base_url = cls._get_config()['base_url']
        parsed = cls._post('documents.info', {'id': doc_id})
        doc = parsed.get('data') or {}
        if not doc.get('id'):
            raise OutlineNotFoundError('Outline document not found.')
        normalized = cls._normalize_document(doc, base_url)
        normalized['text'] = doc.get('text') or ''
        return normalized

    # ── attachment (image) proxy ──────────────────────────────────────────────
    # Outline markdown references images via ``attachments.redirect`` (an auth'd
    # RPC that 302-redirects to a signed blob URL). The browser cannot follow
    # those without the Outline Bearer token, so images come up blank. We:
    #   1) on import/sync, rewrite each Outline attachment URL in the markdown to
    #      a lesson-scoped ILS proxy URL (``rewrite_attachment_urls``); and
    #   2) stream the bytes server-side on demand (``download_attachment``), with
    #      the token kept on the server.

    # Matches an Outline attachment id inside an attachments.redirect URL, whether
    # relative (``/api/attachments.redirect?id=<uuid>``) or absolute
    # (``https://outline.example.com/api/attachments.redirect?id=<uuid>``).
    _ATTACHMENT_URL_RE = re.compile(
        r'(?P<url>(?:https?://[^\s)]+)?/api/attachments\.redirect\?id=(?P<id>[0-9a-fA-F-]+))'
    )

    @classmethod
    def rewrite_attachment_urls(cls, text: str, lesson_id: int) -> str:
        """Rewrite Outline attachment URLs in markdown to the ILS proxy.

        Every ``.../api/attachments.redirect?id=<uuid>`` (relative or absolute) is
        replaced with ``/api/learn/lessons/<lesson_id>/outline-attachment/?id=<uuid>``
        so the browser loads images through our authenticated, server-mediated
        proxy. Called for BOTH import (link_outline) and sync (sync_outline).
        """
        if not text:
            return text

        def _replace(match: 're.Match') -> str:
            attachment_id = match.group('id')
            return (
                f'/api/learn/lessons/{lesson_id}/outline-attachment/'
                f'?id={quote(attachment_id)}'
            )

        return cls._ATTACHMENT_URL_RE.sub(_replace, text)

    @classmethod
    def download_attachment(cls, attachment_id: str) -> tuple[bytes, str]:
        """Fetch attachment bytes from Outline (token stays server-side).

        Hits ``attachments.redirect`` with Bearer auth; urllib follows the 302 to
        the signed blob URL and returns the body. Returns ``(content, content_type)``.

        Raises the standard service exception hierarchy (404 -> NotFound, other ->
        Unavailable), matching the rest of OutlineService.
        """
        config = cls._get_config()
        url = f"{config['base_url']}/api/attachments.redirect"
        payload = json.dumps({'id': attachment_id}).encode('utf-8')
        request = Request(
            url,
            data=payload,
            headers={
                'Authorization': f"Bearer {config['api_token']}",
                'Content-Type': 'application/json',
                'User-Agent': cls.USER_AGENT,
            },
            method='POST',
        )
        try:
            with urlopen(request, timeout=cls.REQUEST_TIMEOUT) as response:
                content = response.read()
                content_type = response.headers.get('Content-Type') or 'application/octet-stream'
        except HTTPError as exc:
            if exc.code == 404:
                raise OutlineNotFoundError('Outline attachment not found.') from exc
            raise OutlineUnavailableError(
                f'Outline returned an error (HTTP {exc.code}).'
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise OutlineUnavailableError('Failed to reach Outline.') from exc

        return content, content_type
