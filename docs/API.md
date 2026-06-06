# API.md — ILS v2 API Reference

> Canonical API reference. Documents the current runtime API surface.
> Last updated: 2026-05-14

---

## 1. Scope and Source of Truth

This document lists API endpoints that match current project progress.

Inclusion rules:
- Include endpoints currently exposed by active backend routing.
- Mark endpoints as `Stable` or `Partial` based on implementation maturity.
- Keep a separate `Planned` section (§4) for slice contracts not implemented yet.
- Keep a separate `Deferred` section (§5) for explicitly postponed features.

Exclusion rules:
- Exclude old/legacy API patterns not aligned with current progress.
- Exclude AI endpoints from active APIs while AI slice remains deferred.

Primary references:
- Runtime routing: `backend/backend/urls.py`, `backend/api/urls.py`, `backend/auth_app/urls.py`, `backend/realtime/routing.py`
- Endpoint behavior: `backend/api/views/*.py`, `backend/auth_app/views.py`
- Project progress gate: `docs/STATUS.md`, `docs/IMPL_PLAN.md`

Compatibility note:
- §3 lists currently active runtime routes. Legacy flat routes (`/api/quizzes/*`) have been removed and return 404.
- Legacy flat routes for Learn (`/api/courses/*`, `/api/lessons/*`) and Challenge (`/api/challenges/*`) remain active for compatibility — see §6 Route Migration for full mapping.
- All new client work must use canonical namespaced paths (`/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`).

---

## 2. Global Conventions

- Base prefix: `/api/`
- Default auth: `Bearer <access_token>`
- Default DRF permission: authenticated users (`IsAuthenticated`) unless endpoint overrides it.
- Default pagination: page size `20` (`backend/backend/settings.py` `REST_FRAMEWORK.PAGE_SIZE`).
- JSON only responses by default.

### Auth behavior in current code

- Active auth endpoints are served by `auth_app` under `/api/auth/*`.
- Current JWT access lifetime: `15 minutes` (`SIMPLE_JWT.ACCESS_TOKEN_LIFETIME`).
- Current JWT refresh lifetime: `7 days` (`SIMPLE_JWT.REFRESH_TOKEN_LIFETIME`).
- Token refresh endpoint validates session hash, rotates token, and enforces per-user refresh rate limit (10 requests/minute).
- Active access-token permission claims: `permissions` (base64 bitmap, 32 bytes decoded) and `pv` (per-user permission version).

### Authorization bootstrap behavior in current code

- Permission records are auto-discovered at startup from decorated class-based endpoints.
- Permission name format: `{app_label}.{resource_name}.{handler_method_name}` (lowercase).
- `resource_name` derived from class name by removing `ViewSet`/`View`/`APIView`/`GenericViewSet`, normalized to snake_case.
- `handler_method_name` is the Python route handler name (`list`, `retrieve`, `tree`, `submit_flag`, `get`, `post`, ...).
- Built-in role mappings synchronized from `@add_role_granted(...)` metadata.
- Role mapping uses explicit handler decorators with precedence `handler-level` > `class-level`.

---

## 3. Active Endpoints

Legend:
- `Stable`: route and handler are present and behavior is mostly complete for current scope.
- `Partial`: route is callable but handler depends on unfinished method/service or broader slice work.

### 3.1 Authentication

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register/` | No | Stable | Creates user + profile, auto-assigns Member role, returns access/refresh tokens. |
| POST | `/api/auth/login/` | No | Stable | Local login with cache-based rate limit and session creation. |
| POST | `/api/auth/token/refresh/` | No | Stable | Validates refresh hash in `user_session`, rotates refresh token/session, enforces per-user refresh rate limit (10/min). |
| POST | `/api/auth/logout/` | Yes | Stable | Revokes current session by refresh token hash. |
| POST | `/api/auth/logout-all/` | Yes | Stable | Revokes all active sessions for authenticated user. |
| POST | `/api/auth/password/change/` | Yes | Stable | Verifies `current_password`, enforces password policy from `auth.password.*` config, updates password hash, revokes all active user sessions. |
| GET | `/api/auth/sessions/` | Yes | Stable | Lists active sessions for authenticated user only; excludes `refresh_token_hash`. |
| DELETE | `/api/auth/sessions/{id}/` | Yes | Stable | Revokes one owned active session; `204` on success, `404` if not found or not owned. |
| GET | `/api/auth/sso/redirect/` | No | Stable | Builds OIDC authorization URL from system config and returns HTTP redirect to Authentik. Used as browser navigation target, not JSON API. |
| GET | `/api/auth/sso/callback/` | No | Stable | Validates OIDC state/nonce, exchanges auth code, links/creates user, returns access/refresh tokens. |
| POST | `/api/auth/identity/link/` | Yes | Stable | Links authenticated user to an external identity (`provider`, `external_id`); response shape `{detail, provider, external_id, created}`. |

Contract notes:
- Auth success payload user object for register/login/sso-callback is minimal: `{id, username, email}`.

### 3.2 Users

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/users/` | Yes | Stable | List users. |
| POST | `/api/users/` | **No** | ⚠️ **TEMP** | **INSECURE — temporary test endpoint with `AllowAny`. Not intended for client registration; use `/api/auth/register/`. Permission gate is scheduled (see follow-up task).** |
| GET | `/api/users/{id}/` | Yes | Stable | User detail. |
| PUT/PATCH | `/api/users/{id}/` | Yes | Stable | Update user. |
| DELETE | `/api/users/{id}/` | Yes | Stable | Delete user. |
| GET | `/api/users/me/` | Yes | Stable | Current user info. |
| GET | `/api/users/me/profile/` | Yes | Stable | Current user profile + stats. |
| PATCH | `/api/users/me/profile/` | Yes | Stable | Partial update for current profile fields. |
| PATCH | `/api/users/me/settings/` | Yes | Stable | Updates language, theme, and timezone. |
| PATCH | `/api/users/me/account/` | Yes | Stable | Updates username and email with validation. |
| GET | `/api/users/me/activity/` | Yes | Stable | Current user activity feed (latest 30 events). |
| GET | `/api/users/{username}/profile/` | No | Stable | Public profile for a user by username. |
| GET | `/api/users/{username}/activity/` | No | Stable | Public activity feed for a user by username. |
| GET | `/api/admin/users/` | Yes (Admin) | Stable | Admin list users with filters: `is_active`, `date_joined_from`, `date_joined_to` (accepts `YYYY-MM-DD` or ISO datetime). |
| POST | `/api/admin/users/` | Yes (Admin) | Stable | Admin create user; password is optional; `UserProfile` is auto-created; defaults to `Member` role if `role_ids` is omitted. |
| GET | `/api/admin/users/{id}/` | Yes (Admin) | Stable | Admin user detail with profile and assigned roles. |
| PUT/PATCH | `/api/admin/users/{id}/` | Yes (Admin) | Stable | Admin update; response includes user, profile, and role context; disabling user revokes all active sessions immediately. |

### 3.3 Courses (Learn)

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/learn/courses/` | Yes | Partial | Canonical list; supports `category`, `status`, `search`; member visibility enforced to published-only. Includes `user_progress` object (`completed`, `total`) for authenticated users. |
| POST | `/api/learn/courses/` | Yes | Partial | Canonical create; editor/admin only; slug conflict returns `409` with suggestions. |
| GET | `/api/learn/courses/{slug}/` | Yes | Partial | Canonical detail with slug lookup. |
| PUT | `/api/learn/courses/{slug}/` | Yes | Partial | Canonical update; editor/admin only. |
| DELETE | `/api/learn/courses/{slug}/` | Yes | Partial | Default archive, optional admin-only purge (`?mode=purge`). |
| GET | `/api/learn/courses/{slug}/progress/` | Yes | Partial | Response `{lesson_count, completed, percent}`; versioned lazy recompute when `course.structure_version` changes. |
| GET | `/api/learn/courses/{slug}/nodes/` | Yes | Partial | Root-level course nodes (`parent=null`); lazy tree payload with `has_children`. |
| GET | `/api/learn/courses/{slug}/nodes/{id}/children/` | Yes | Partial | Lazy-load children for a folder node. |
| POST | `/api/learn/courses/{slug}/nodes/` | Yes | Partial | Create folder or lesson item node; item create performs atomic `Lesson + CourseNode` creation; `system_config[learn.max_tree_depth]` enforced. |
| PUT | `/api/learn/courses/{slug}/nodes/{id}/` | Yes | Partial | Rename/reorder/move node; editor/admin only; move updates descendant paths via `bulk_update`; bumps `course.structure_version`. |
| DELETE | `/api/learn/courses/{slug}/nodes/{id}/` | Yes | Partial | Delete node + subtree; deletes attached lessons to avoid orphans. |
| GET | `/api/learn/categories/` | Yes | Partial | Category list. |
| POST | `/api/learn/categories/` | Yes | Partial | Create; admin only. |
| GET | `/api/learn/categories/{id}/` | Yes | Partial | Category detail. |
| PUT | `/api/learn/categories/{id}/` | Yes | Partial | Update; admin only. |
| DELETE | `/api/learn/categories/{id}/` | Yes | Partial | Delete; admin only. |
| GET | `/api/learn/tags/` | Yes | Partial | Tag list. |
| POST | `/api/learn/tags/` | Yes | Partial | Create; permission-gated (admin/editor). |
| GET | `/api/learn/tags/{id}/` | Yes | Partial | Tag detail. |
| PUT | `/api/learn/tags/{id}/` | Yes | Partial | Update; permission-gated (admin/editor). |
| DELETE | `/api/learn/tags/{id}/` | Yes | Partial | Delete; permission-gated (admin/editor). |
| GET | `/api/learn/lessons/{id}/` | Yes | Partial | Member visibility restricted to lessons whose owning course is `published`. Detail includes `outline_info` (null unless linked to Outline). |
| PUT | `/api/learn/lessons/{id}/` | Yes | Partial | Editor/admin only. |
| POST | `/api/learn/lessons/{id}/progress/start/` | Yes | Partial | Idempotent upsert of `user_lesson_progress.started_at`. |
| POST | `/api/learn/lessons/{id}/progress/complete/` | Yes | Partial | Idempotent completion; triggers course/profile aggregate updates via signal chain. |
| GET | `/api/learn/lessons/{id}/questions/` | Yes | Partial | Mini-quiz lesson question mapping list; requires `lesson_type=miniquiz` (otherwise 400). |
| POST | `/api/learn/lessons/{id}/questions/` | Yes | Partial | Attach existing `QuizQuestion`; editor/admin only; duplicate attach returns 409. |
| GET | `/api/learn/lesson-questions/{id}/` | Yes | Partial | Mini-quiz mapping detail; member visibility restricted to published courses. |
| PUT | `/api/learn/lesson-questions/{id}/` | Yes | Partial | Update mapping position; editor/admin only. |
| DELETE | `/api/learn/lesson-questions/{id}/` | Yes | Partial | Delete mapping; editor/admin only. |
| GET | `/api/learn/outline/collections/` | Yes (Admin/Editor) | Stable | Browse Outline collections (`?offset`, `?limit`). Server-mediated; requires `outline.enabled` + `outline.url`/`outline.api_token` (else 409). Outline unreachable → 503. |
| GET | `/api/learn/outline/documents/` | Yes (Admin/Editor) | Stable | Browse Outline documents (`?collection_id`, `?offset`, `?limit`); `text` omitted from list payload. |
| POST | `/api/learn/lessons/{id}/outline/` | Yes (Admin/Editor) | Stable | Body `{outline_doc_id}`. Links the lesson + imports markdown into `content_md`, sets `source=outline`, upserts `lesson_outline`. Doc already linked to another lesson → 409; doc missing → 404; Outline down → 503. Returns lesson detail. |
| POST | `/api/learn/lessons/{id}/sync-outline/` | Yes (Admin/Editor) | Stable | Re-pull from the linked Outline doc; updates `content_md` + `revision`/`last_synced_at`. Not linked → 400; Outline failure → **503 with old content preserved**. |
| DELETE | `/api/learn/lessons/{id}/outline/` | Yes (Admin/Editor) | Stable | Detach from Outline; resets `source=manual`, keeps `content_md`. Not linked → 400. |

Legacy flat routes (retained during migration — see §6 Route Migration):

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/courses/` | Yes | Partial | Legacy-flat compatibility route. |
| POST | `/api/courses/` | Yes | Partial | Legacy-flat compatibility route. |
| GET | `/api/courses/{id}/` | Yes | Partial | Legacy-flat compatibility route. |
| PUT/PATCH | `/api/courses/{id}/` | Yes | Partial | Legacy-flat compatibility route. |
| DELETE | `/api/courses/{id}/` | Yes | Partial | Legacy-flat compatibility route. |
| GET | `/api/courses/{id}/tree/` | Yes | Partial | Tree integrity rules for full Slice 5 scope are pending. |
| GET | `/api/courses/{id}/progress/` | Yes | Partial | Uses the same versioned recompute pipeline as namespaced endpoint. |
| POST | `/api/courses/{id}/enroll/` | Yes | Partial | Full enrollment/progress contract pending. |

### 3.4 Lessons (legacy flat)

Routes in this subsection are legacy-flat paths kept for compatibility — see §6 for migration targets.

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/lessons/` | Yes | Stable | Read-only list endpoint (no canonical namespaced list available — see §6.1). |
| GET | `/api/lessons/{id}/` | Yes | Stable | Read-only detail endpoint. |
| POST | `/api/lessons/{id}/complete/` | Yes | Partial | Delegates to unified lesson completion pipeline. |
| GET | `/api/lessons/{id}/render/` | Yes | Partial | Depends on lesson rendering implementation details. |

### 3.5 Challenges

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/challenge/challenges/` | Yes | Partial | Flat list (LimitOffset paginated: `count/next/previous/results`). Members see published only. Filters: `status`, `difficulty`, `category`, `search`, `tags=1,2,3` (AND), `solved=true|false`. Each row includes `is_solved`. |
| POST | `/api/challenge/challenges/` | Yes | Partial | Create challenge (admin/editor only). |
| GET | `/api/challenge/challenges/{slug}/` | Yes | Partial | Challenge detail (slug lookup). |
| PUT/PATCH | `/api/challenge/challenges/{slug}/` | Yes | Partial | Update challenge (admin/editor only). |
| DELETE | `/api/challenge/challenges/{slug}/` | Yes | Partial | Archive by default; purge when `?mode=purge` (admin/editor only). |
| GET | `/api/challenge/categories/` | Yes | Partial | Category list. |
| POST | `/api/challenge/categories/` | Yes | Partial | Category create (admin/editor only). |
| GET | `/api/challenge/categories/{id}/` | Yes | Partial | Category detail. |
| PUT/PATCH | `/api/challenge/categories/{id}/` | Yes | Partial | Category update (admin/editor only). |
| DELETE | `/api/challenge/categories/{id}/` | Yes | Partial | Category delete (admin/editor only). |
| GET | `/api/challenge/tags/` | Yes | Partial | Tag list. |
| POST | `/api/challenge/tags/` | Yes | Partial | Tag create (admin/editor only). |
| GET | `/api/challenge/tags/{id}/` | Yes | Partial | Tag detail. |
| PUT/PATCH | `/api/challenge/tags/{id}/` | Yes | Partial | Tag update (admin/editor only). |
| DELETE | `/api/challenge/tags/{id}/` | Yes | Partial | Tag delete (admin/editor only). |
| GET | `/api/challenge/nodes/` | Yes | Partial | Root nodes only; folder-first then title A→Z. |
| POST | `/api/challenge/nodes/` | Yes | Partial | Create node (admin/editor only); `{title, parent_id, is_item}`. `is_item=true` atomically creates a draft Challenge (slug from title) and links it. Response includes `challenge_slug`. |
| GET | `/api/challenge/nodes/{id}/` | Yes | Partial | Node detail. |
| PUT/PATCH | `/api/challenge/nodes/{id}/` | Yes | Partial | Update node title (admin/editor only). |
| DELETE | `/api/challenge/nodes/{id}/` | Yes | Partial | Delete node (admin/editor only). |
| GET | `/api/challenge/nodes/{id}/children/` | Yes | Partial | Direct children only (lazy load); folder-first then title A→Z. |
| POST | `/api/challenge/nodes/{id}/move/` | Yes | Partial | Move node (admin/editor only); cycle/depth-safe; bulk-updates descendant paths (no N+1). |
| GET | `/api/challenge/nodes/explorer/` | Yes | Partial | File-explorer root: `{folder, breadcrumb, nodes[]}`; item nodes carry challenge summary + `is_solved`; members see published items only. |
| GET | `/api/challenge/nodes/{id}/explorer/` | Yes | Partial | File-explorer contents of folder `{id}` (same shape as root). |
| GET | `/api/challenge/challenges/{slug}/flags/` | Yes (Admin/Editor) | Stable | List flags. `flag_value` omitted for non-Admin/Editor. |
| POST | `/api/challenge/challenges/{slug}/flags/` | Yes (Admin/Editor) | Stable | Create flag (static or regex). |
| PUT/PATCH | `/api/challenge/challenges/{slug}/flags/{id}/` | Yes (Admin/Editor) | Stable | Update flag. |
| DELETE | `/api/challenge/challenges/{slug}/flags/{id}/` | Yes (Admin/Editor) | Stable | Delete flag. |
| POST | `/api/challenge/challenges/{slug}/submit/` | Yes | Stable | Payload `{flag}`; response `{correct}`. Server-side check; `flag_value` never returned. On first solve: updates progress, increments counters, triggers notification. |
| GET | `/api/challenge/challenges/{slug}/progress/` | Yes | Stable | Per-challenge progress for current user: `{is_solved, attempt_count, completed_at}`. |
| GET | `/api/challenge/progress/` | Yes | Stable | Aggregate for current user: `{solved_count, total_attempts}`. |
| POST | `/api/challenge/challenges/{slug}/instance/start/` | Yes | Stable | Start instance. Idempotent if running instance exists. `400` if challenge is not `instance_required`. |
| POST | `/api/challenge/challenges/{slug}/instance/stop/` | Yes | Stable | Stop running instance. `404` if no running instance. |
| GET | `/api/challenge/challenges/{slug}/instance/status/` | Yes | Stable | Returns latest instance for user, or `{status: "none"}`. |
| GET | `/api/challenge/instances/` | Yes (Admin/Editor) | Stable | List instances; filterable by `challenge`, `user`, `status`. |
| POST | `/api/challenge/instances/{id}/kill/` | Yes (Admin) | Stable | Force-terminate any instance. |

Notes:
- `flag_value` is role-gated at serializer level — Member responses never include the field.
- Instance routes use `MockDeploymentBackend` (Wave 1); `instance_info` contains mock connection data until Wave 2 wires `SocketDeploymentBackend`.

Legacy flat routes (kept for compatibility — see §6):

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/challenges/` | Yes | Partial | Legacy flat route. |
| POST | `/api/challenges/` | Yes | Partial | Legacy flat route. |
| GET | `/api/challenges/{id}/` | Yes | Partial | Legacy flat route. |
| PUT/PATCH | `/api/challenges/{id}/` | Yes | Partial | Legacy flat route. |
| DELETE | `/api/challenges/{id}/` | Yes | Partial | Legacy flat route. |
| POST | `/api/challenges/{id}/submit-flag/` | Yes | Partial | Legacy; canonical: `/api/challenge/challenges/{slug}/submit/`. |
| POST | `/api/challenges/{id}/create-instance/` | Yes | Partial | Legacy; canonical: `/api/challenge/challenges/{slug}/instance/start/`. |

### 3.6 Quizzes

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/quiz/quizzes/` | Yes | Partial | Paginated list; members see published only. Flat-search filters: `search`, `category`, `tags` (comma ids, AND), `solved`, `status`. Each row carries `category_name`, `tags`, `is_solved`. |
| POST | `/api/quiz/quizzes/` | Yes | Partial | Create; editor/admin role required; accepts `category_id` + `tag_ids`. `quiz_point` is read-only (derived = sum of question scores). |
| GET | `/api/quiz/quizzes/{id}/` | Yes | Partial | Detail (nested `category`, `tags`, `questions`). `quiz_point` is the derived max score. |
| PUT/PATCH | `/api/quiz/quizzes/{id}/` | Yes | Partial | Update; editor/admin role required; accepts `category_id` + `tag_ids`. `quiz_point` read-only (ignored if sent). |
| DELETE | `/api/quiz/quizzes/{id}/` | Yes | Partial | Delete; editor/admin role required. |
| GET/POST | `/api/quiz/categories/` | Yes | Partial | Quiz category list/create; create editor/admin only. |
| GET/PUT/PATCH/DELETE | `/api/quiz/categories/{id}/` | Yes | Partial | Quiz category detail/update/delete; mutate editor/admin only. |
| GET/POST | `/api/quiz/tags/` | Yes | Partial | Quiz tag list/create; create editor/admin only. |
| GET/PUT/PATCH/DELETE | `/api/quiz/tags/{id}/` | Yes | Partial | Quiz tag detail/update/delete; mutate editor/admin only. |
| GET | `/api/quiz/quizzes/{id}/progress/` | Yes | Partial | Per-user aggregate (`best_score`, `attempt_count`, attempt timestamps); deterministic zero/default payload when no progress exists. |
| GET | `/api/quiz/quizzes/{id}/questions/` | Yes | Partial | Question management list; editor/admin only. |
| POST | `/api/quiz/quizzes/{id}/questions/` | Yes | Partial | Question create; supports single/multi/fill_blank validation; syncs `quiz.total_questions` + derived `quiz_point`. |
| GET | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Question detail; editor/admin only. |
| PUT | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Question update; editor/admin only; resyncs derived `quiz_point`. |
| DELETE | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Question delete; syncs `quiz.total_questions` + derived `quiz_point`. |
| GET | `/api/quiz/quizzes/{id}/config/` | Yes | Partial | Per-user config retrieval (auto-creates default). Fields: `total_questions` (null=all), `time_limit_sec` (null=no limit), `random_question`, `random_option`, `question_filter` (`all`/`unsolved`/`solved`), `immediate_feedback`. |
| PUT | `/api/quiz/quizzes/{id}/config/` | Yes | Partial | Per-user config upsert; snapshotted into the attempt when the next session starts. |
| GET | `/api/quiz/nodes/` | Yes | Partial | Root list (`parent IS NULL`); folder-first then title A→Z. |
| POST | `/api/quiz/nodes/` | Yes | Partial | Atomic create (`title`, `parent_id`, `is_item`); editor/admin only. `is_item=true` creates a draft `Quiz` + linked node (response carries `quiz` id). |
| GET | `/api/quiz/nodes/explorer/` | Yes | Partial | File-explorer root: `{folder, breadcrumb, nodes[]}`; item nodes carry quiz summary + `is_solved`; members see published items only. |
| GET | `/api/quiz/nodes/{id}/explorer/` | Yes | Partial | File-explorer contents of folder `{id}` (same shape as root). |
| GET | `/api/quiz/nodes/{id}/` | Yes | Partial | Node detail. |
| PUT/PATCH | `/api/quiz/nodes/{id}/` | Yes | Partial | Rename via `title`; editor/admin only (`is_item`/`quiz` immutable). |
| DELETE | `/api/quiz/nodes/{id}/` | Yes | Partial | Subtree deletion via cascade. |
| GET | `/api/quiz/nodes/{id}/children/` | Yes | Partial | Lazy children list; folder-first then title A→Z. |
| POST | `/api/quiz/nodes/{id}/move/` | Yes | Partial | Explicit move (`parent_id`); cycle-safe, bulk descendant path update. |

Session lifecycle (start/answer/finish) is handled exclusively via WebSocket — see §3.6.1.

### 3.6.1 Quiz WebSocket (Real-time Practice Sessions)

| Endpoint | Protocol | Auth | Status | Notes |
|---|---|---|---|---|
| `ws://host/ws/quiz/{quiz_id}/` | WebSocket | First-message JWT | Stable | Real-time quiz session. Connect without token in URL, then send `{"type":"auth","token":"<access_jwt>"}` within 5-second timeout. |

**First-message auth flow:**
```json
CLIENT → {"type": "auth", "token": "eyJ..."}
SERVER ← {"type": "auth_ok", "user_id": 123, "username": "alice"}
```

**Start attempt:**
```json
CLIENT → {"action": "start"}
SERVER ← {"type": "question", "attempt_id": 789, "question": {...}, "progress": {"current": 1, "total": 10}}
```
The server reads the user's saved `quiz_config` at start: it filters the question set
(`question_filter`: all/unsolved/solved), optionally shuffles (`random_question`/`random_option`),
and caps to `total_questions`. Each `question` payload carries `immediate_feedback`; when
`false` the client auto-advances without showing per-question results. Question visibility
follows the parent **Quiz** status — there is no per-question publish lifecycle.

**Submit answer (polymorphic by question type):**
```json
// Single-choice
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"option_id": 42}}
SERVER ← {"type": "answer_result", "is_correct": true, "score_obtained": 10, "explanation": "...", "correct_answer": {"option_id": 42}}

// Multi-choice
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"option_ids": [42, 43]}}
SERVER ← {"type": "answer_result", "is_correct": true, "score_obtained": 10, ...}

// Fill-blank
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"text": "answer text"}}
SERVER ← {"type": "answer_result", "is_correct": true, ...}
```

**Get next question or finish:**
```json
CLIENT → {"action": "next"}
SERVER ← {"type": "question", ...} // if more questions remain
SERVER ← {"type": "finish", "attempt_id": 789, "total_score": 100, "max_score": 100, "duration_sec": 245}
```

**Error event:**
```json
SERVER → {"type": "error", "code": "already_answered", "message": "Question already answered"}
```

### 3.7 Notifications

Notification action endpoints use hyphenated paths (`mark-read`, `mark-all-read`, `unread-count`).

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/notifications/` | Yes | Stable | List current user's notifications (unread first, then newest first). |
| GET | `/api/notifications/{id}/` | Yes | Stable | Notification detail for current user scope. |
| POST | `/api/notifications/{id}/mark-read/` | Yes | Stable | Mark one owned notification as read (`404` if not owned). |
| POST | `/api/notifications/mark-all-read/` | Yes | Stable | Mark all unread notifications of current user as read. |
| GET | `/api/notifications/unread-count/` | Yes | Stable | Returns unread badge payload `{count: N}`. |
| POST | `/api/admin/notifications/broadcast/` | Yes (Admin) | Stable | Broadcast to all active users; response includes `recipient_count` and `broadcast_batch_key`; creates one `Notification` row per active user (`is_broadcast=true`). |
| GET | `/api/admin/notifications/history/` | Yes (Admin) | Stable | Paginated grouped manual broadcast batches with sender, sent timestamp, and `recipient_count`. |

Auto-trigger signals are active for challenge/course/quiz completion with `event_key` deduplication.

WebSocket:

| Protocol | Path | Auth | Status | Notes |
|---|---|---|---|---|
| WS | `/ws/notifications/` | First-message JWT (`{"type":"auth","token":"..."}`) | Stable | Subscribes current user to channel group `notifications_{user_id}` and pushes `{"type":"notification","data":{...}}` events for newly-created notifications. |

### 3.8 Leaderboard

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/stats/leaderboard/` | Yes | Stable | Canonical endpoint. Supports `type=overall\|challenge\|quiz\|course`; returns `type`, `my_rank`, `total_users`, and paged `results`. |
| GET | `/api/leaderboard/` | Yes | Stable | Compatibility alias returning the same payload. |

Pagination: leaderboard uses a dedicated page size default of **10** (`limit` query param overrides; see `backend/api/services/leaderboard_service.py:DEFAULT_PAGE_SIZE`). This differs from the project-wide DRF `PAGE_SIZE=20`.

### 3.9 System Config

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/admin/config/` | Admin | Stable | List grouped by `category`: `{[category]: SystemConfig[]}`; secret values masked by default. |
| GET | `/api/admin/config/{key}/` | Admin | Stable | Detail lookup by config key (supports dotted keys); secret values are **always masked** (`***`) on this path. |
| GET | `/api/admin/config/{key}/reveal/` | Admin (`system.config.read_secret`) | Stable | Returns the real (unmasked) value for secret keys. Gated by the code-registered permission `system.config.read_secret` (granted to `Admin` by default). |
| PATCH | `/api/admin/config/{key}/` | Admin | Stable | Value update with type validation (`bool`, `int`, `string`, `json`, `secret`). |

Notes:
- `PATCH` returns `403` with `{"detail": "Config is not editable"}` when `is_editable=false`.
- Invalid payload type for config `value_type` returns `400` with deterministic validation error.
- Cache for non-runtime config reads is invalidated after successful updates.
- Frontend admin config page is implemented at locale routes `/vi/admin/config` and `/en/admin/config`.

### 3.10 Authorization / RBAC

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/admin/permissions/` | Admin | Partial | Read-only permission list; supports `include_inactive=true` query. |
| GET | `/api/admin/roles/` | Admin | Partial | Role list. |
| POST | `/api/admin/roles/` | Admin | Partial | Custom role creation. |
| GET | `/api/admin/roles/{id}/` | Admin | Partial | Role detail. |
| PUT/PATCH | `/api/admin/roles/{id}/` | Admin | Partial | Role update; system role rename blocked. |
| DELETE | `/api/admin/roles/{id}/` | Admin | Partial | Role delete; system role delete blocked. |
| GET | `/api/admin/roles/{id}/permissions/` | Admin | Partial | Assigned permissions for role. |
| POST | `/api/admin/roles/{id}/permissions/` | Admin | Partial | Permission assignment payload `{permission_id}`. |
| DELETE | `/api/admin/roles/{id}/permissions/{perm_id}/` | Admin | Partial | Permission revoke for role mapping. |
| GET | `/api/users/{id}/roles/` | Admin | Partial | List roles assigned to a user. Custom viewset (`UserRoleViewSet`) supports only `list`, `create`, `destroy`. |
| POST | `/api/users/{id}/roles/` | Admin | Partial | Assign role using payload `{role_id}`. |
| DELETE | `/api/users/{id}/roles/{role_id}/` | Admin | Partial | Remove role from user. |

Notes:
- Canonical role-permission assignment route: `/api/admin/roles/{id}/permissions/`.
- RBAC endpoints are admin-only and include action-level `HasJWTPermission('<permission_key>')` checks.
- Role-permission and user-role mapping changes invalidate permission cache for affected users.
- Frontend RBAC admin pages at `/vi/admin/rbac`, `/en/admin/rbac`, `/vi/admin/rbac/roles/{id}`, `/vi/admin/rbac/users/{id}/roles`.

### 3.11 Statistics

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/admin/stats/` | Admin | Stable | Returns `user_count`, `active_today`, and `solves_week`. |
| GET | `/api/admin/stats/users/{id}/` | Admin | Stable | Returns nested `user`, `points`, `completion`, `activity`, and `sessions` groups for the selected user id. |

---

## 4. Planned APIs (Not Implemented Yet)

These contracts are planned but are not active in the current backend routing.

### 4.1 Slice 1 — Authentication

- `POST /api/auth/password/reset/`
- `POST /api/auth/password/reset/confirm/`

Deferred by decision `Q-INFRA-03` until email backend setup is finalized.

### 4.2 Slice 5 — Learn (frontend delivery beyond Task 5.4)

- Frontend Learn delivery and Outline integration remain pending (`Task 5.5` to `Task 5.8`) — see `docs/IMPL_PLAN.md` Slice 5.

### 4.3 Slice 6 — Challenge (GitLab sync, Task 6.8)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/challenge/challenges/{slug}/sync-gitlab/` | Admin/Editor | Trigger GitLab sync. Reads `challenge.git.url` from `system_config`. Returns updated `ChallengeGitlab` record. |

---

## 5. Deferred APIs

### Slice 10 — AI Assistant

Deferred by project decision. Do not treat as active API.

- Candidate route family: `/api/ai/*`
- Backend root router does not activate AI URLs (`backend/backend/urls.py:24` is commented out).
- Scaffold exists at `backend/ai/urls.py` (single stub route `/ask/`) — kept for future activation, not callable in current build.

---

## 6. Route Migration / Legacy

> Single source of truth for endpoint migration from historical/legacy examples to canonical contracts.

### 6.1 HTTP Route Migration

| Domain | Legacy Route | Canonical Target | Notes |
|---|---|---|---|
| Learn | `/api/courses/` | `/api/learn/courses/` | Domain namespaced |
| Learn | `/api/courses/{id}/` | `/api/learn/courses/{slug}/` | Identifier changes from `id` to `slug` |
| Learn | `/api/courses/{id}/tree/` | `/api/learn/courses/{slug}/nodes/` | Tree contract is node-based |
| Learn | `/api/courses/{id}/progress/` | `/api/learn/courses/{slug}/progress/` | Same feature, namespaced path |
| Learn | `/api/lessons/{id}/` | `/api/learn/lessons/{id}/` | Domain namespaced |
| Learn | `/api/lessons/{id}/complete/` | `/api/learn/lessons/{id}/progress/complete/` | Completion under progress namespace |
| Learn | `/api/lessons/` (list) | _no canonical namespaced list_ | Legacy `/api/lessons/` remains the only list endpoint; per-id operations migrate to `/api/learn/lessons/{id}/...`. |
| Challenge | `/api/challenges/` | `/api/challenge/challenges/` | Domain namespaced |
| Challenge | `/api/challenges/{id}/` | `/api/challenge/challenges/{slug}/` | Identifier changes from `id` to `slug` |
| Challenge | `/api/challenges/{id}/submit-flag/` | `/api/challenge/challenges/{slug}/submit/` | Submit contract unified |
| Challenge | `/api/challenges/{id}/create-instance/` | `/api/challenge/challenges/{slug}/instance/{start\|stop\|status}/` | Lifecycle split into 3 sub-endpoints (no unified `/instance/` route) |
| System Config | `/api/config/` | `/api/admin/config/` | Admin-only API |
| System Config | `/api/config/{key}/` | `/api/admin/config/{key}/` | Key-based lookup/update |

Usage rules:
- Legacy routes are retained only for runtime compatibility during migration.
- New implementation and new documentation must use canonical target routes.
- If a legacy route and target route differ in identifier semantics (`id` vs `slug`), follow the target contract.

### 6.2 WebSocket Auth Migration

| Legacy Pattern | Canonical Pattern | Notes |
|---|---|---|
| `ws://host/ws/quiz/{quiz_id}/?token={jwt}` | Connect without token, then send first message `{"type":"auth","token":"<access_jwt>"}` | Avoids token leakage in logs/history |

### 6.3 Removed legacy routes (return 404)

| Route | Removed in | Canonical replacement |
|---|---|---|
| `GET /api/quizzes/` | Slice 7 Task 7.1 | `GET /api/quiz/quizzes/` |
| `GET /api/quizzes/{id}/` | Slice 7 Task 7.1 | `GET /api/quiz/quizzes/{id}/` |
| All `/api/quizzes/*` sub-routes | Slice 7 Task 7.1 | `/api/quiz/quizzes/*` |

---

## 7. Error and Security Notes

- Error payload shape is currently endpoint-dependent and will be normalized in later slices.
- System Config secret values are always masked on list/detail; clear-text access is via the dedicated `GET /api/admin/config/{key}/reveal/` endpoint, gated by permission `system.config.read_secret` (Admin by default).
- API documentation must be updated in the same session whenever endpoint routing or serializer contract changes.

---

## 8. Change Control

When endpoint behavior changes:
1. Update this file first (`docs/API.md`).
2. Reconcile progress state in `docs/STATUS.md`.
3. If scope or sequencing changes, update `docs/IMPL_PLAN.md`.
4. If document dependencies change, update `CLAUDE.md`.
