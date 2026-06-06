"""Server-mediated client for the GitLab REST API v4.

Design constraints (mirrors ``outline_service.py`` — see docs/DECISIONS.md
Q-LEARN-06 / Q-LEARN-10 and plan/feature-challenge-task6-8-attachment-gitlab-1.md):
- Server-mediated: only the backend talks to GitLab; the access token never
  leaves the server. The frontend consumes normalized data from our own
  endpoints and never sees GitLab URLs or the token.
- Synchronous blocking (no Celery in MVP). Callers translate the exceptions
  raised here into HTTP status codes; on GitLab failure the caller preserves the
  old content ("fetch-first, write-after").

HTTP is done with the standard-library ``urllib`` (``requests`` is not a project
dependency), matching ``outline_service.py`` and ``auth_app/services/sso_service``.

GitLab API v4 reference used here (authenticated with header ``PRIVATE-TOKEN``;
works for both a Personal Access Token and a Group Access Token with scopes
``read_api`` + ``read_repository``):
- ``GET /api/v4/projects?membership=true&search=`` -> list of projects
- ``GET /api/v4/projects/{id}``                     -> single project
- ``GET /api/v4/projects/{id}/repository/commits?ref_name=&per_page=1``
- ``GET /api/v4/projects/{id}/repository/tree?ref=`` -> root tree entries
- ``GET /api/v4/projects/{id}/repository/files/{urlenc(path)}/raw?ref=``
"""

import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from api.utils import get_config


class GitlabConfigError(Exception):
    """GitLab integration is disabled or misconfigured (maps to HTTP 409/400)."""


class GitlabUnavailableError(Exception):
    """GitLab is unreachable, timed out, or returned an error (maps to HTTP 503)."""


class GitlabNotFoundError(Exception):
    """The requested GitLab resource does not exist (maps to HTTP 404)."""


class GitlabService:
    """Normalizing client for the GitLab REST API v4."""

    REQUEST_TIMEOUT = 20
    # Self-hosted GitLab behind a WAF (e.g. Cloudflare) may block the default
    # ``Python-urllib`` User-Agent. Send a neutral product UA so requests are not
    # filtered (see RISK-002 in the plan).
    USER_AGENT = 'ILS-GitLab-Sync/1.0'

    # ── configuration ────────────────────────────────────────────────────────
    @staticmethod
    def _get_config() -> dict:
        """Read and validate GitLab config from system_config.

        Raises GitlabConfigError when disabled or missing url/token.
        """
        if not get_config('challenge.git.enabled', False):
            raise GitlabConfigError('GitLab integration is disabled.')

        base_url = (get_config('challenge.git.url', '') or '').rstrip('/')
        token = (get_config('challenge.git.token', '') or '').strip()

        if not base_url:
            raise GitlabConfigError('Missing challenge.git.url configuration.')
        if not token:
            raise GitlabConfigError('Missing challenge.git.token configuration.')

        return {'base_url': base_url, 'token': token}

    # ── low-level transport ──────────────────────────────────────────────────
    @classmethod
    def _request(cls, path: str, params: dict | None = None, raw: bool = False):
        """GET {base}/api/v4{path} with PRIVATE-TOKEN auth.

        Returns parsed JSON (``raw=False``) or the raw response bytes
        (``raw=True``, for file downloads). Translates transport/HTTP failures
        into the service exception hierarchy:
        - HTTP 404                       -> GitlabNotFoundError
        - other HTTP / network / timeout -> GitlabUnavailableError
        - invalid JSON                   -> GitlabUnavailableError
        """
        config = cls._get_config()
        url = f"{config['base_url']}/api/v4{path}"
        if params:
            url = f'{url}?{urlencode(params)}'

        request = Request(
            url,
            headers={
                'PRIVATE-TOKEN': config['token'],
                'Accept': 'application/json',
                'User-Agent': cls.USER_AGENT,
            },
            method='GET',
        )

        try:
            with urlopen(request, timeout=cls.REQUEST_TIMEOUT) as response:
                payload = response.read()
        except HTTPError as exc:
            if exc.code == 404:
                raise GitlabNotFoundError('GitLab resource not found.') from exc
            raise GitlabUnavailableError(
                f'GitLab returned an error (HTTP {exc.code}).'
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise GitlabUnavailableError('Failed to reach GitLab.') from exc

        if raw:
            return payload

        try:
            return json.loads(payload.decode('utf-8'))
        except ValueError as exc:
            raise GitlabUnavailableError('GitLab returned invalid JSON.') from exc

    # ── normalization helpers ────────────────────────────────────────────────
    @staticmethod
    def _normalize_project(project: dict) -> dict:
        return {
            'id': project.get('id'),
            'name': project.get('name') or '',
            'path_with_namespace': project.get('path_with_namespace') or '',
            'web_url': project.get('web_url') or '',
            'default_branch': project.get('default_branch') or 'main',
        }

    # ── public API ───────────────────────────────────────────────────────────
    @classmethod
    def list_projects(cls, search: str = '', page: int = 1, per_page: int = 20) -> list:
        """List projects the token is a member of, optionally filtered by ``search``."""
        params = {
            'membership': 'true',
            'order_by': 'last_activity_at',
            'per_page': max(1, min(per_page, 100)),
            'page': max(1, page),
        }
        if search:
            params['search'] = search
        data = cls._request('/projects', params)
        return [cls._normalize_project(p) for p in (data or [])]

    @classmethod
    def get_project(cls, project_id) -> dict:
        """Fetch a single normalized project by id."""
        data = cls._request(f'/projects/{quote(str(project_id), safe="")}')
        if not data or not data.get('id'):
            raise GitlabNotFoundError('GitLab project not found.')
        return cls._normalize_project(data)

    @classmethod
    def get_latest_commit_sha(cls, project_id, ref: str | None = None) -> str | None:
        """Return the latest commit SHA on ``ref`` (default branch if None)."""
        params = {'per_page': 1}
        if ref:
            params['ref_name'] = ref
        data = cls._request(
            f'/projects/{quote(str(project_id), safe="")}/repository/commits', params
        )
        if data:
            return data[0].get('id')
        return None

    @classmethod
    def list_root_tree(cls, project_id, ref: str | None = None) -> list:
        """List the repository root tree entries (files + dirs at the top level)."""
        params = {'per_page': 100}
        if ref:
            params['ref'] = ref
        data = cls._request(
            f'/projects/{quote(str(project_id), safe="")}/repository/tree', params
        )
        return [
            {
                'name': entry.get('name') or '',
                'path': entry.get('path') or '',
                'type': entry.get('type') or '',  # 'blob' (file) | 'tree' (dir)
            }
            for entry in (data or [])
        ]

    @classmethod
    def get_raw_file(cls, project_id, path: str, ref: str | None = None) -> bytes:
        """Download the raw bytes of a repository file at ``path`` on ``ref``."""
        params = {}
        if ref:
            params['ref'] = ref
        encoded_path = quote(str(path), safe='')
        return cls._request(
            f'/projects/{quote(str(project_id), safe="")}/repository/files/{encoded_path}/raw',
            params,
            raw=True,
        )

    @classmethod
    def get_raw_file_text(cls, project_id, path: str, ref: str | None = None) -> str | None:
        """Return a repository file decoded as UTF-8 text, or None if missing."""
        try:
            data = cls.get_raw_file(project_id, path, ref)
        except GitlabNotFoundError:
            return None
        try:
            return data.decode('utf-8')
        except UnicodeDecodeError:
            return data.decode('utf-8', errors='replace')
