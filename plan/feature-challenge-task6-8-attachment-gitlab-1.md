---
goal: Task 6.8 (Phase 1) — Challenge Attachment Files + GitLab Sync
version: 1.0
date_created: 2026-06-06
last_updated: 2026-06-06
owner: ILS v2 team
status: 'Completed'
tags: [feature, challenge, gitlab, attachment, api, slice-6]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

This plan delivers **Phase 1** of the remaining Challenge work: (1) a real attachment-file mechanism (`challenge_file` table + media storage + upload/download endpoints) shared by both manual and GitLab challenges, and (2) GitLab import/sync (Task 6.8) implemented server-mediated like `OutlineService`. Phase 2 (instance deployment + external deploy server) is tracked separately in `feature-challenge-task6-9-instance-deploy-server-1.md`.

Mechanism summary: ILS never lets the frontend touch GitLab directly. The backend calls GitLab REST API v4 with a read-only Group Access Token, pulls metadata + README + selected attachment files, stores them under `MEDIA_ROOT`, and serves downloads through permission-gated endpoints. The recommended CTF repo layout is `challenge.yml` + `README.md` + `attachment.zip`/`dist/` (player-facing) + `deploy/` (instance-only; not exposed to players).

## 1. Requirements & Constraints

- **REQ-001**: Add a `challenge_file` table (model `ChallengeFile`) storing per-challenge attachment metadata: `challenge` (FK), `filename`, `storage_key`, `size`, `content_type`, `source` (`'upload'`|`'gitlab'`), `gitlab_path` (nullable), audit fields.
- **REQ-002**: Add `MEDIA_ROOT` / `MEDIA_URL` to settings; store files physically at `MEDIA_ROOT/challenges/<slug>/<filename>`; serve media in dev only.
- **REQ-003**: Manual upload — Admin/Editor upload a file (multipart) → save to media → create `ChallengeFile(source='upload')`.
- **REQ-004**: GitLab import/sync — backend lists the repo root tree, frontend selects files (default-checked `attachment.zip` + `README.md`), backend downloads raw bytes → `ChallengeFile(source='gitlab')`; `README.md` content also populates `challenge.description`.
- **REQ-005**: Player download — `GET .../files/{id}/download/` streams bytes from media only when the challenge is published and the requester has a valid role; never expose GitLab URLs or absolute media paths.
- **REQ-006**: GitLab client is server-mediated (token never leaves server) and uses standard-library `urllib` (no `requests` dependency), mirroring `backend/api/services/outline_service.py`.
- **REQ-007**: GitLab auth uses header `PRIVATE-TOKEN: <token>` and reads `challenge.git.{enabled,url,token}` from `system_config`; supports both PAT and Group Access Token (scopes `read_api` + `read_repository`).
- **REQ-008**: Sync is "fetch-first, write-after" (Q-LEARN-10 pattern): on GitLab failure raise → caller returns 503 and old content is preserved.
- **SEC-001**: Frontend never calls GitLab directly; the token stays server-side and `challenge.git.token` remains an encrypted secret config.
- **CON-001**: Use namespaced challenge routes (`/api/challenge/*`) with explicit URL mappings; Admin/Editor only for management endpoints, Member for download.
- **CON-002**: MVP does NOT parse `challenge.yml` (metadata auto-fill deferred); only README + manual file selection are used.
- **GUD-001**: Mirror `OutlineService` exception hierarchy (`*ConfigError` 409/400, `*UnavailableError` 503, `*NotFoundError` 404) in `gitlab_service.py`.
- **PAT-001**: Per CLAUDE.md propagation rules, update `docs/DATA_MODEL.md` before/with the ORM change, and `docs/API.md` + `docs/STATUS.md` in the same session.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Attachment-file foundation (model, media storage, upload/list/delete/download) usable by both manual and GitLab challenges.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `MEDIA_ROOT` (e.g. `BASE_DIR/media`) and `MEDIA_URL='/media/'` to `backend/backend/settings.py`; serve media in dev via `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)` in `backend/backend/urls.py`. | ✅ | 2026-06-06 |
| TASK-002 | Add `ChallengeFile(FullAudit)` model to `backend/api/models.py` (after `Challenge`) with `db_table='challenge_file'`, fields per REQ-001, FK `db_column='challenge_id'`, `related_name='files'`, index on `challenge`. Generate migration `python manage.py makemigrations api`. | ✅ | 2026-06-06 |
| TASK-003 | Update `docs/DATA_MODEL.md` Challenge domain to add the `challenge_file` table schema (Tier 2 → ORM sync rule, DATA_MODEL authoritative). | ✅ | 2026-06-06 |
| TASK-004 | Add file helpers to `backend/api/services/challenge_service.py`: `save_uploaded_file(challenge, django_file) -> ChallengeFile`, `list_files(challenge)`, `delete_file(challenge_file)` (delete row + unlink media), `store_bytes(challenge, filename, data, source, gitlab_path=None)`. Compute `storage_key=challenges/<slug>/<filename>`. | ✅ | 2026-06-06 |
| TASK-005 | Add serializers `ChallengeFileSerializer` (read: `id,filename,size,content_type,source,created_at`) in `backend/api/serializers/challenge.py`; export in `backend/api/serializers/__init__.py`. | ✅ | 2026-06-06 |
| TASK-006 | Add view actions to `LearnChallengeViewSet` in `backend/api/views/challenges.py`: `files` (`GET` list, `POST` multipart upload — Admin/Editor), `file_detail` (`DELETE` — Admin/Editor), `file_download` (`GET` — Member; require `status='published'` or Admin/Editor; stream via `FileResponse`). | ✅ | 2026-06-06 |
| TASK-007 | Wire routes in `backend/api/urls.py`: `.../challenges/{slug}/files/` (GET/POST), `.../challenges/{slug}/files/{id}/` (DELETE), `.../challenges/{slug}/files/{id}/download/` (GET). | ✅ | 2026-06-06 |
| TASK-008 | Frontend: `AdminChallengeFilesTab.tsx` (upload/list/delete) wired into `AdminChallengeEditorPageClient.tsx`; show download list in `ChallengeDetailClient.tsx`; add service methods + types in `frontend/src/services/challenges.service.ts` and `frontend/src/types/challenge.types.ts`. | ✅ | 2026-06-06 |

### Implementation Phase 2

- GOAL-002: GitLab import/sync (Task 6.8) reusing the attachment foundation from GOAL-001.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Create `backend/api/services/gitlab_service.py` modeled on `outline_service.py`: exceptions `GitlabConfigError/GitlabUnavailableError/GitlabNotFoundError`; `_get_config()` reads `challenge.git.{enabled,url,token}`; `_get(path, params)` does GET with header `PRIVATE-TOKEN`, timeout, custom User-Agent, maps HTTPError→exceptions. | ✅ | 2026-06-06 |
| TASK-010 | Add GitLab API methods: `list_projects(search, page)` → `/api/v4/projects?membership=true&search=`; `get_project(id)`; `get_latest_commit_sha(id, ref)` → `/repository/commits?ref_name=&per_page=1`; `list_root_tree(id, ref)` → `/repository/tree?ref=`; `get_raw_file(id, path, ref)` → `/repository/files/{urlenc(path)}/raw?ref=`. Normalize project fields to `{id,name,path_with_namespace,web_url,default_branch}`. | ✅ | 2026-06-06 |
| TASK-011 | Add `import_from_gitlab(project_id, parent_node_id, selected_files)` to `challenge_service.py`: fetch metadata + README, create `Challenge(source='gitlab')` + node, create `ChallengeGitlab` (project_id/url/default_branch/last_commit_sha/last_synced_at), download selected files via `store_bytes(... source='gitlab')`. | ✅ | 2026-06-06 |
| TASK-012 | Add `sync_gitlab(challenge)` to `challenge_service.py`: fetch-first then write — refetch README→`description`, re-download gitlab-sourced files, update `last_commit_sha`/`last_synced_at`. On GitLab failure propagate exception (caller → 503, old content preserved). | ✅ | 2026-06-06 |
| TASK-013 | Add endpoints (Admin/Editor) in `challenges.py` + `urls.py`: `GET /api/challenge/gitlab/projects/`, `GET /api/challenge/gitlab/projects/{id}/files/`, `POST /api/challenge/gitlab/import/`, `POST /api/challenge/challenges/{slug}/sync-gitlab/`. Map service exceptions to 400/404/409/503. | ✅ | 2026-06-06 |
| TASK-014 | Frontend: `AdminChallengeGitlabTab.tsx` — project picker (search), root-file list with `attachment.zip`+`README.md` default-checked, import/sync buttons, show `last_synced_at`/`last_commit_sha`; wire into editor; add service methods + `GitlabProject` type. (README markdown *preview* not added — description is shown via Metadata tab.) | ✅ | 2026-06-06 |
| TASK-015 | Add `backend/api/tests/test_gitlab_sync_api.py` (mock `urllib`) and `test_challenge_file_api.py`; update `docs/API.md` (files + gitlab endpoints), `docs/STATUS.md` (mark Task 6.8 Phase 1 done + report ref), and `docs/CONFIG.md` (note Group Access Token for `challenge.git.token`). | ✅ | 2026-06-06 |

## 3. Alternatives

- **ALT-001**: Link frontend directly to GitLab raw URLs (no download to media). Rejected — breaks server-mediated rule and leaks GitLab/token to clients.
- **ALT-002**: Keep `storage_path` string only, attach files via filesystem convention. Rejected — no metadata, no permission-gated download, no GitLab/non-GitLab parity.
- **ALT-003**: Parse `challenge.yml` to auto-fill metadata on import. Deferred — adds a rigid repo-format dependency; MVP fills metadata manually.

## 4. Dependencies

- **DEP-001**: Existing `Challenge`, `ChallengeGitlab`, `ChallengeNode` models and `ChallengeService.create_challenge_node_atomic()`.
- **DEP-002**: `backend/api/services/outline_service.py` as the structural template; `api.utils.get_config` for system_config reads.
- **DEP-003**: `system_config` keys `challenge.git.{enabled,url,token}` already seeded (CONFIG.md §challenge.git).
- **DEP-004**: A reachable GitLab instance with a read-only Group Access Token for manual e2e verification.

## 5. Files

- **FILE-001**: `backend/backend/settings.py`, `backend/backend/urls.py` (MEDIA_ROOT/MEDIA_URL + dev media serving).
- **FILE-002**: `backend/api/models.py` + new migration (`ChallengeFile`).
- **FILE-003**: `backend/api/services/gitlab_service.py` (new GitLab API v4 client).
- **FILE-004**: `backend/api/services/challenge_service.py` (file helpers + `import_from_gitlab` + `sync_gitlab`).
- **FILE-005**: `backend/api/serializers/challenge.py`, `backend/api/serializers/__init__.py` (ChallengeFile serializer).
- **FILE-006**: `backend/api/views/challenges.py`, `backend/api/urls.py` (file + gitlab endpoints).
- **FILE-007**: `frontend/src/components/features/challenges/admin/AdminChallengeFilesTab.tsx`, `AdminChallengeGitlabTab.tsx` (new tabs) + `AdminChallengeEditorPageClient.tsx` wiring.
- **FILE-008**: `frontend/src/components/features/challenges/ChallengeDetailClient.tsx` (download list).
- **FILE-009**: `frontend/src/services/challenges.service.ts`, `frontend/src/types/challenge.types.ts` (methods + types).
- **FILE-010**: `docs/DATA_MODEL.md`, `docs/API.md`, `docs/STATUS.md`, `docs/CONFIG.md` (doc propagation).
- **FILE-011**: `backend/api/tests/test_challenge_file_api.py`, `backend/api/tests/test_gitlab_sync_api.py` (new tests).

## 6. Testing

- **TEST-001**: `pytest backend/api/tests/test_challenge_file_api.py` — upload→list→download happy path; download blocked for draft/unauthorized (403/404); delete removes row + media.
- **TEST-002**: `pytest backend/api/tests/test_gitlab_sync_api.py` — mock `urllib`: `list_projects`/`get_raw_file`/`sync_gitlab`; disabled config → `GitlabConfigError`; network error → `GitlabUnavailableError`; `sync_gitlab` updates `description`/`last_commit_sha`/`last_synced_at` (AC-CHAL-06).
- **TEST-003**: `pytest backend/api/tests/test_challenge_api.py` — regression: challenge CRUD unaffected.
- **TEST-004**: Manual e2e — point `challenge.git.*` at a real GitLab (read-only group token); list projects → select files → import/sync → verify files downloadable and metadata updated.

## 7. Risks & Assumptions

- **RISK-001**: Large attachments via GitLab raw download could be slow/blocking (synchronous MVP, no Celery). Mitigate with `REQUEST_TIMEOUT` and reasonable size expectations.
- **RISK-002**: WAF (e.g. Cloudflare) may block default `urllib` User-Agent on self-hosted GitLab — set a custom UA like in `OutlineService`.
- **ASSUMPTION-001**: A `README.md` exists at repo root; absence is handled gracefully (empty description, no crash).
- **ASSUMPTION-002**: Local filesystem media storage is sufficient for the single-instance, ~100-user deployment.

## 8. Related Specifications / Further Reading

- `docs/IMPL_PLAN.md` (Slice 6 Task 6.8)
- `docs/prd/04-challenge.md` (FR-CHAL-04 GitLab Import, AC-CHAL-06)
- `docs/REQUIREMENTS.md §2.4` (Challenge content import from GitLab)
- `docs/CONFIG.md §challenge.git` (GitLab config keys)
- `docs/DATA_MODEL.md` (challenge / challenge_gitlab schema)
- `backend/api/services/outline_service.py` (structural template)
- `plan/feature-challenge-task6-9-instance-deploy-server-1.md` (Phase 2 — instance deployment)
