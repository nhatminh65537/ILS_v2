# Session Report: Outline Content Sync (Task 5.8)

**Date:** 2026-06-06
**Slices / Areas:** Slice 5 – Learn · Task 5.8 (Outline Sync API + lesson-editor tab)

## Summary

Implemented end-to-end Outline content sync: editors can browse an Outline instance,
link a document to a lesson, import its markdown into `lesson.content_md`, re-sync, and
unlink — all server-mediated so the Outline API token never reaches the browser. The
backend `OutlineService` (stdlib `urllib`) talks to Outline's RPC API; five new endpoints
expose browse/link/sync/unlink; the lesson editor's previously-deferred Outline tab is now
a functional collection→document picker. Verified with 13 unit tests and a live HTTP
end-to-end run against `collab.n3m3s1s.org`.

## Completed Items

- `OutlineService` client (config reader, `urllib` transport with WAF-safe User-Agent, `collections.list` / `documents.list` / `documents.info`, response normalization, exception hierarchy).
- `LessonService.link_outline` / `sync_outline` / `unlink_outline`.
- Serializers: `LessonOutlineInfoSerializer`, `OutlineLinkSerializer`, `outline_info` on `LearnLessonDetailSerializer`.
- Views: `LearnOutlineViewSet` (collections/documents) + `link_outline`/`sync_outline`/`unlink_outline` actions on `LearnLessonViewSet`; shared exception→HTTP mapper.
- 5 URL routes under `/api/learn/outline/*` and `/api/learn/lessons/{id}/(outline|sync-outline)/`.
- Frontend: types, service functions, `useAdminLearnLessonEditor` handlers, `AdminLearnLessonOutlineTab`, editor wiring, i18n (en/vi), MSW handlers.
- Tests: `backend/api/tests/test_outline_sync.py` (13). Live HTTP E2E verified.
- Docs: `API.md §3.3`, `STATUS.md`, `IMPL_PLAN.md` Task 5.8.

## Key Implementations

### OutlineService (server-mediated client)

1. `_get_config()` reads `outline.enabled` (must be true), `outline.url` (rstrip `/`), `outline.api_token`; raises `OutlineConfigError` if disabled/missing.
2. `_post(method, body)` does `POST {base}/api/<method>` with `Authorization: Bearer …` **and a non-default `User-Agent`** — the live instance sits behind Cloudflare, which returns HTTP 403 (error 1010) for the default `Python-urllib` UA.
3. Transport failures map to exceptions: HTTP 404 → `OutlineNotFoundError`; other HTTP / `URLError` / timeout / bad-JSON → `OutlineUnavailableError`.
4. `list_documents` strips the bulky `text` field (not needed for the picker); `get_document` keeps it. Document `url` is relative on Outline, so the absolute viewer URL is `base_url + url`.

### Link / Sync (503-preserves-content guarantee)

1. `link_outline` fetches the document **before** opening a transaction; a dup-linked `outline_doc_id` (unique) raises `ValueError` → 409.
2. On success it upserts `lesson_outline` (`outline_doc_id`, `outline_url`, `revision`, `last_synced_at`) and sets `lesson.content_md` + `lesson.source = outline` atomically.
3. `sync_outline` re-fetches first; because the fetch precedes any DB write, an Outline failure propagates with **no DB mutation**, so the previous `content_md`/`revision` stay intact → the view returns **503**.

### Exception → HTTP mapping (views)

1. `_outline_error_response`: `OutlineConfigError` → 409, `OutlineNotFoundError` → 404, `OutlineUnavailableError` → 503.
2. `ValueError` from the service (not-linked / dup-doc) → 400 / 409 in the action.

### Frontend Outline tab

1. Unlinked: loads collections (`listOutlineCollections`), then documents per collection with offset/limit "load more"; **Link & import** calls the hook's `submitOutlineLink`, which replaces lesson state with the returned detail (refreshing `content_md` + `outline_info` for all tabs).
2. Linked: shows `last_synced_at`, `revision`, editor-only "View source on Outline" link; **Sync now** / **Unlink** (confirm). The axios interceptor drops HTTP status, so error messages are keyed off the backend `detail` text (disabled / unreachable / not-found / already-linked).

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/outline_service.py` | New: Outline RPC client + exceptions + normalization. |
| `backend/api/services/lesson_service.py` | Added link/sync/unlink Outline helpers. |
| `backend/api/serializers/course.py` | `LessonOutlineInfoSerializer`, `OutlineLinkSerializer`, `outline_info` on detail. |
| `backend/api/serializers/__init__.py` | Export new serializers. |
| `backend/api/views/courses.py` | `LearnOutlineViewSet`, lesson outline actions, error mapper. |
| `backend/api/views/__init__.py` | Export `LearnOutlineViewSet`. |
| `backend/api/urls.py` | 5 Outline routes. |
| `backend/api/tests/test_outline_sync.py` | New: 13 tests. |
| `frontend/src/types/lesson.types.ts` | `LearnLessonOutlineInfo`, `outline_info`, Outline collection/document/paginated types. |
| `frontend/src/services/lessons.service.ts` | 5 Outline service functions. |
| `frontend/src/hooks/useAdminLearnLessonEditor.ts` | `submitOutlineLink/Sync/Unlink` + Outline error mapper. |
| `frontend/src/components/features/courses/admin/AdminLearnLessonOutlineTab.tsx` | New: picker + linked-state tab. |
| `frontend/src/components/features/courses/admin/AdminLearnLessonEditorPageClient.tsx` | Replaced placeholder with the tab. |
| `frontend/src/mocks/handlers/courses.handlers.ts` | MSW handlers for the 5 endpoints. |
| `frontend/messages/{en,vi}.json` | Populated `adminLearn.outline.*`. |
| `docs/API.md`, `docs/STATUS.md`, `docs/IMPL_PLAN.md` | Endpoint + status updates. |

## Notes / Caveats

- **Cloudflare WAF / User-Agent**: any Outline deployment behind Cloudflare rejects the default `Python-urllib` UA (HTTP 403 / error 1010). The service sends `User-Agent: ILS-Outline-Sync/1.0`. If a future deployment still 403s, this is the first thing to check.
- **No model/migration change**: `LessonOutline`, `Lesson.source`, and the three `outline.*` config keys already existed. To enable in an environment, set `outline.enabled=true`, `outline.url`, `outline.api_token` via the System Config admin UI.
- **Member exposure**: `outline_info` is returned on lesson detail to all roles, but it contains only doc id + absolute viewer URL (no token). The FE renders the source link only in the admin editor, never in the member viewer (honors Q-LEARN-06).
- **Async**: still synchronous-blocking per Q-LEARN-10; Celery-based async remains a future enhancement.
- Full backend suite not run end-to-end this session (long-running); ran the targeted Outline + learn-lesson + learn-course + views-export suites (38 tests, all green) plus ruff.
