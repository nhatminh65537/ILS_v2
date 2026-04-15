# ILS v2 — OpenMemory Project Index

## Overview

Self-hosted cybersecurity learning platform for small orgs (~100 members).
Three domains: **Learn** (courses/lessons), **Challenge** (CTF), **Quiz** (self-practice).
Target: one instance per organization, no horizontal scale needed.

## Architecture

- **Backend**: Django 6 + DRF + Django Channels (WebSocket) + SimpleJWT
- **Frontend**: Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + Zustand
- **Database**: PostgreSQL (SQLite in dev)
- **Auth**: JWT with permission claims encoded in token; SSO via Authentik
- **Authorization**: API-based flat RBAC; **bitmap encoding** (base64, ≤256 permissions) in JWT; per-user `permission_version`; built-in roles via `@add_role_granted` decorator
- **AuthZ Bypass**: `system_config[auth.authorization_enabled]` (default `true`) — set to `false` to bypass RBAC for dev/testing; MUST be `true` in production

## Key Files

| File | Purpose |
|------|---------|
| `design/database/vx/dbv3.sql` | **Legacy artifact** — historical schema, not authoritative |
| `backend/api/models.py` | All ORM models (~1195 lines) |
| `backend/ai/` | ⚠️ DEFERRED — AI assistant scaffold (not active, not in INSTALLED_APPS) |
| `backend/backend/settings.py` | Django config (SQLite dev, PostgreSQL commented out) |
| `docs/STATUS.md` | Implementation status per slice |
| `docs/BUGS.md` | Known bugs and fix history |
| `docs/CONFIG.md` | Canonical system_config keys |
| `docs/API.md` | Canonical API reference by implementation progress |
| `AGENT.md` | AI agent quick-reference guide |

## Components

- **api app**: All domain models and current domain viewsets for users, courses, lessons, challenges, quizzes, notifications, leaderboard, and system config.
- **learn namespaced API (Slice 5 Task 5.1)**: Active canonical endpoints `/api/learn/courses/*`, `/api/learn/categories/*`, `/api/learn/tags/*` implemented in `backend/api/views/courses.py` with slug detail lookup and compatibility-preserved legacy `/api/courses/*` routes.
- **learn course node tree API (Slice 5 Task 5.2)**: Active canonical endpoints `/api/learn/courses/{slug}/nodes/`, `/api/learn/courses/{slug}/nodes/{id}/children/` plus editor/admin writes (`POST/PUT/DELETE`). Supports atomic item create (Lesson+Node), bulk subtree move with descendant `path` updates via `bulk_update`, max depth enforcement via `system_config[learn.max_tree_depth]`, subtree delete lesson cleanup, and `course.structure_version` bump.
- **learn lesson CRUD + miniquiz mappings (Slice 5 Task 5.3)**: Active canonical endpoints `/api/learn/lessons/{id}/` (GET/PUT), `/api/learn/lessons/{id}/questions/` (GET/POST attach), and `/api/learn/lesson-questions/{id}/` (GET/PUT/DELETE). Member visibility is restricted to lessons whose owning course is `published`. Write operations are editor/admin only.
- **learn progress tracking API + signal chain (Slice 5 Task 5.4)**: Active canonical endpoints `/api/learn/lessons/{id}/progress/start/`, `/api/learn/lessons/{id}/progress/complete/`, and `/api/learn/courses/{slug}/progress/`. Progress uses versioned lazy recompute with `user_course_progress` cache fields and first-completion-only profile reward increments.
- **ai app**: ⚠️ DEFERRED — scaffold only (AIAskView, 3 modes, mock LLM); NOT in INSTALLED_APPS; do not activate until approved
- **realtime app**: Django Channels scaffold (empty logic)
- **auth_app**: Implemented for Slice 1 Task 1.1 + 1.2 auth endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/token/refresh`, `/api/auth/logout`, `/api/auth/logout-all`) with session hash tracking, refresh-token rotation, and per-user refresh rate limiting.
- **frontend quiz admin editor (Slice 7 Task 7.7)**: Admin surface routes `/{locale}/admin/quizzes/*` with metadata CRUD, question CRUD/reorder, member-style preview, typed hooks (`useAdminQuizzes`, `useAdminQuizQuestions`), and canonical service contract `/api/quiz/quizzes/*`.
- **frontend foundation (Slice 4)**: Next.js locale-first app routes under `app/[locale]`, typed service layer in `src/services`, domain Zustand stores in `src/stores`, MSW mock stack in `src/mocks`, and shadcn primitives in `src/components/ui`.
- **Abstract ORM**: CreateAudit, UpdateAudit, FullAudit, SoftDeleteAudit, BaseNode, BaseCategory, BaseTag
- **UserSession model**: Added in `api` for refresh-token session tracking (`user_session` table)

## Status

- All domain ORM models complete; API layer is partially implemented and tracked in `docs/API.md`
- Slice 5 Task 5.1 completed on 2026-04-15: namespaced Learn CRUD APIs active with member published-only visibility enforcement, course `user_progress` projection, slug-conflict `409` suggestions, and archive-default/admin-purge delete behavior.
- Slice 5 Task 5.2 completed on 2026-04-15: namespaced Learn course node tree API active at `/api/learn/courses/{slug}/nodes/*` with lazy children loading, atomic lesson+node create, bulk subtree moves, max depth enforcement (`learn.max_tree_depth`), subtree delete lesson cleanup, and `course.structure_version` bumping.
- Slice 5 Task 5.3 completed on 2026-04-15: namespaced Learn lesson detail/update is active at `/api/learn/lessons/{id}/` plus miniquiz question mapping endpoints under `/api/learn/lessons/{id}/questions/` and `/api/learn/lesson-questions/{id}/` with published-only member visibility and editor/admin write gates.
- Slice 5 Task 5.4 completed on 2026-04-15: namespaced Learn progress endpoints are active (`/api/learn/lessons/{id}/progress/start/`, `/api/learn/lessons/{id}/progress/complete/`, `/api/learn/courses/{slug}/progress/`), `user_course_progress` now stores cache/version fields for lazy recompute, and `UserLessonProgress` completion signal updates course/profile aggregates through `LearnProgressService`.
- Backend refactor wrap-up completed on 2026-04-14: API serializers split into domain package `backend/api/serializers/`, view business logic extracted to `backend/api/services/*`, backend tests normalized under app-local `tests/` packages with `test_*.py` naming, and canonical docs synchronized (`STATUS/IMPL_PLAN/BUGS/ARCHITECTURE`).
- Bugfix pass completed on 2026-04-14 for H4/H6/H8/M6/M7/M9/M10: wired quiz progress endpoint, enforced admin-user username/email uniqueness checks, aligned quiz detail payload with `category` and non-negative `quiz_point` validation, moved public profile route to public surface with not-found dialog UX, and added username-change confirmation + forced re-login flow with field-level error preservation.
- Bugfix pass completed on 2026-04-14 for active FE/MSW issues H2, M2, M4, M5, L3: admin quiz status filter now applies in MSW list handler, Try Again remounts quiz session deterministically via restart nonce keying, ICU placeholders `{title}`/`{device}` interpolate correctly in vi/en, and account save button is disabled when no effective changes exist.
- Slice 7 Task 7.7 implemented on 2026-04-13: frontend admin quiz editor complete under `/{locale}/admin/quizzes`, `/{locale}/admin/quizzes/new`, `/{locale}/admin/quizzes/{id}`, `/{locale}/admin/quizzes/{id}/questions` with metadata CRUD, question CRUD for `single_choice`/`multi_choice`/`fill_blank`, deterministic reorder, preview panel, i18n (`admin.quizzes`, `adminQuizzes.*`), and MSW nested question handlers/permission fixtures.
- Slice 7 Task 7.5 implemented on 2026-04-10: quiz browser frontend complete — catalog page (`/quizzes`) with `QuizFilterPanel` (search + shadcn Select time-limit + tag badge pills), detail page (`/quizzes/[id]`) with progress card; `useQuizzes` hook with parallel `getQuizById`+`getQuizProgress`; all quiz types aligned to backend serializers; `(catalog)` route group introduced; Quizzes added to navbar/sidebar; all native `<select>` elements replaced with shadcn `<Select>` across admin UI.
- Slice 8 Task 8.4 implemented on 2026-04-10: frontend admin user management page complete at `/{locale}/admin/users` — paginated table (20/page) with search + `is_active` server-side filter; activate/deactivate toggle (deactivate guarded by confirmation dialog); "Manage roles" link → `/admin/rbac/users/{id}/roles`; create-user dialog (username required, email/password optional); `adminUsers` i18n namespace added (EN + VI); MSW handlers (`adminUsersHandlers`) + fixture (`adminUsersFixture`) added for all 4 admin user endpoints; `AdminLayout` extended with `usersLabel` prop + sidebar/top-nav link; i18n double-namespace bug fixed (`errors.*` not `adminUsers.errors.*` inside `useTranslations('adminUsers')`).
- Slice 8 Task 8.5 implemented on 2026-04-13: frontend session management page complete at `/{locale}/profile/sessions` with `GET/DELETE /api/auth/sessions/*` integration, current-session highlight/protection, per-session revoke, bulk "revoke all other sessions" flow, dropdown/settings navigation entry, locale i18n keys (`navigation.sessions`, `profile.sessions.*`), and MSW mock handlers/fixtures for auth sessions.
- Slice 8 Task 8.3 implemented on 2026-04-10: frontend profile pages complete — `/profile/[username]` (public view: ProfileHeader + ProfileStats + ActivityTimeline) and `/profile/settings` (ProfileEditForm + AppSettingsForm + AccountForm + deferred placeholders for password/SSO); `/profile` redirects server-side to `/profile/settings`; avatar dropdown uses "Hồ sơ" / "Cài đặt" pattern (GitHub-style); MSW coverage extended for all Task 8.1 endpoints; `navigation.settings` i18n key added.
- Slice 8 Task 8.2 implemented on 2026-04-02: admin user management API is active at `/api/admin/users/*` with `is_active` + `date_joined_from/date_joined_to` filters, optional-password admin create (default Member role when `role_ids` omitted), and immediate session revocation when disabling users.
- Slice 1 Task 1.1 implemented on 2026-03-26: `auth_app` now serves `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/logout-all` with hashed refresh-token session tracking and endpoint tests.
- Slice 1 Task 1.2 implemented on 2026-03-26: `/api/auth/token/refresh` now validates refresh hash against active `user_session`, rotates refresh token/session on success, enforces per-user refresh rate limit (10/min), and keeps JWT access TTL aligned to 15 minutes.
- Slice 1 Task 1.3 implemented on 2026-03-30: SSO/AuthentiK backend endpoints are active (`GET /api/auth/sso/redirect/`, `GET /api/auth/sso/callback/`, `POST /api/auth/identity/link/`) with OIDC state/nonce validation (cache TTL 5 minutes), account-link conflict handling, and test coverage expanded to 22 passing auth tests.
- Slice 1 Task 1.4A implemented on 2026-04-13: auth password/session APIs are active (`POST /api/auth/password/change/`, `GET /api/auth/sessions/`, `DELETE /api/auth/sessions/{id}/`) with runtime password policy checks from `auth.password.*`, active-session filtering, ownership-safe revoke-by-id, and all auth_app tests passing after coverage expansion.
- Slice 1 Task 1.5 implemented on 2026-04-01: frontend auth pages (`/vi|en/login`, `/vi|en/register`) now use interactive feature components, localized validation/error mapping, direct SSO redirect (`/api/auth/sso/redirect/`), and guarded token refresh flow that skips auth endpoints to avoid retry loops.
- Slice 4 Frontend Foundation implemented on 2026-03-31: typed contracts + services, Zustand store scaffolding, MSW handlers/fixtures/provider, next-intl (`vi` default, `en` secondary) locale routing, and baseline UI primitives/documents (`FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md`).
- Slice 4 runtime stabilization applied on 2026-03-31: removed redundant shadcn Tailwind package import from `frontend/app/globals.css` to resolve intermittent `Can't resolve 'tailwindcss'` runtime failures.
- Slice 2 Task 2.1 implemented on 2026-03-30: startup permission auto-discovery is active via `auth_app.services.permission_discovery`, syncing `Permission.is_active`, built-in role mappings from `@add_role_granted`, and lowercase naming format `{app_label}.{resource_name}.{handler_method_name}`.
- 2026-04-01 RBAC frontend list normalization: `frontend/src/services/rbac.service.ts` now flattens DRF paginated list payloads before `useRbac` or RBAC views consume them, preventing `filter is not a function` crashes when `/api/admin/permissions/` is paginated.
- Slice 7 Task 7.2 implemented on 2026-04-01: QuizNode tree API is active at `/api/quiz/nodes/*` with folder-only MVP validation (`is_item=false`), lazy children endpoint, explicit move endpoint with cycle prevention, and integration coverage in `backend/api/test_quiz_task7_1.py`.
- Q-AUTH-02 resolved on 2026-03-17 (Option B: `seed_admin` command as first-admin bootstrap)
- Slice 1 decision gate resolved on 2026-03-23 for implementation readiness: namespaced API routes (`/api/auth/*`, `/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`), password reset email flow deferred with Task 1.4, LocMem (dev) + Redis (prod) cache policy for rate limiting, memory-only token storage with refresh flow, auto-assign Member role on register, and superuser local-login emergency fallback for SSO-only outage.
- Four CRITICAL Slice 1 blockers resolved on 2026-03-24: Q-SLICE1-01 Option A (bootstrap role seeding), Q-INFRA-01 Option A (keep `frontend/app/`), Q-AUTH-04 Option A (15m access + 7d refresh with silent refresh), and Q-AUTH-05 Option C (temporary default bootstrap password + forced reset).
- Slice 0 Task 0.2 implemented: user-domain alignment + initial migration applied
- Local dev DB initialized (`backend/db.sqlite3`) after first migrate
- **New decisions (2026-03-12):** R-DEV-01 (AuthZ bypass toggle), R-DEV-02 (Functional requirements priority)
- **Implementation principle:** Functional requirements first; non-functional only when needed or all functional done
- **Doc consistency (2026-03-12):** All config keys across 16 docs normalized to match `CONFIG.md` canonical names; `DATA_MODEL.md` header fixed to be self-authoritative (was incorrectly pointing to `dbv3.sql`)
- **Code consistency (2026-03-12):** Core ORM and authz service updated toward docs: tree nodes use `path` (dot-separated), permissions are flat + deny-only override, `user_permission_cache` uses text payload with per-user versioning, and `system_config` schema moved to canonical `config_type` + runtime/editable flags. `manage.py check` passes.
- API documentation baseline created on 2026-03-26: `docs/API.md` is canonical for endpoint inventory by maturity (`Stable`/`Partial`/`Planned`/`Deferred`) and excludes deferred AI routes from active scope.

## Patterns

- **Dot-separated `path`** for all tree structures (e.g., `"1.3"`) — lazy loading via `parent_id` filter is primary; `path` for depth/validation only
- **Learn slug conflict contract**: Course create on duplicate slug must return HTTP `409` with deterministic `suggestions` array; do not fall back to silent auto-slug mutation.
- **Learn lesson visibility hardening**: For member role, canonical learn lesson endpoints must return not-found for lessons whose owning course is not `published` (avoid existence leaks); editor/admin can access regardless of course status.
- **Learn progress idempotency pattern**: `start` and `complete` progress endpoints are idempotent, preserving first timestamps and preventing duplicate completion side effects.
- **Learn completion aggregation pattern**: `post_save(UserLessonProgress)` recomputes `UserCourseProgress` caches and increments profile course counters only on first incomplete->complete transition.
- **Backend monolith split pattern**: keep import compatibility while moving code from monolithic modules to domain packages (`serializers/`, `services/`, `tests/`), then remove legacy entry files only after all imports and test discovery are aligned.
- **Same-route restart pattern for WS session UIs**: when restarting a stateful session on the same path, append deterministic nonce query (e.g., `?restart=<timestamp>`) and key the session client by route id + nonce to force guaranteed remount/cleanup/reconnect.
- **Admin quiz editor contract pattern**: Frontend admin quiz flows must consume canonical namespaced routes (`/api/quiz/quizzes/*`) via service-layer helpers and keep question payloads type-safe by question kind (`single_choice`, `multi_choice`, `fill_blank`) before submit.
- **Admin user management contract**: use dedicated `/api/admin/users/*` viewset + serializer (do not overload public `UserViewSet`), return `user + profile + roles` after mutations, and revoke all active sessions when `is_active` becomes false.
- Explicit join tables for M2M (not Django ManyToManyField)
- All models inherit FullAudit; explicit `db_table` and `db_column` on every model
- **Join tables** (tag maps, role_permission): use **CreateAudit only** — no updated_at/updated_by
- `TextChoices` for all enums (Status: draft/published/archived)
- Services in `<app>/services/` directory pattern
- Permission cache in `user_permission_cache` table; `encoded_permissions TEXT` (base64 bitmap); versioned with per-user `user.permission_version`
- **Instance deployment**: Strategy pattern — `InstanceDeploymentBackend` Protocol; current: `SocketDeploymentBackend`; replaceable with HTTP/gRPC
- **No DB triggers** — all denormalized updates at Django app level (signals/services)
- `lesson.status` and `quiz_question.status` — both use `content_status` enum (draft/published/archived)
- **AuthZ bypass check**: `HasJWTPermission` checks `get_config('auth.authorization_enabled', True)` before bitmap check; returns `True` immediately if disabled
- **Functional-first priority**: Backend API functional → Backend non-functional → Frontend functional → Frontend non-functional
- **Config key authority chain**: `CONFIG.md` (canonical) → PRDs reference it → `IMPL_PLAN.md` seed_config matches it → `PRD-10` summary table matches it
- **AI provider**: `openai` / `anthropic` (NOT `ollama`) — see `CONFIG.md` ai.* group
- **ORM naming alignment**: Prefer schema-aligned field names from docs (`path`, `external_id`, `encoded_permissions` as TEXT-like payload) and keep permission model flat (no hierarchy).
- **User profile naming alignment**: Use `total_learning_point`, `total_challenge_point`, `total_quiz_point` naming in code and serializers.
- **Profile page UX pattern**: Avatar dropdown follows GitHub/GitLab pattern — "Hồ sơ" links to public `/profile/{username}`, "Cài đặt" links to `/profile/settings`. Profile removed from top navbar; kept in sidebar only.
- **Catalog route group pattern**: Feature pages with content filter panels (quizzes, courses, challenges) live under `(catalog)` route group with `showSidebar=false`. Each `*CatalogClient.tsx` renders its own two-column layout (sticky `w-56` filter panel left + content grid right) — no sidebar injection through layout hierarchy. See `docs/FE_CONVENTIONS.md` Catalog Route Group Pattern section.
- **Quiz type field names (aligned to backend)**: `time_limit_sec` (not `time_limit_seconds`), `quiz_point`, `total_questions`; no `pass_score_percent`, no `is_shuffled`; `QuizQuestion.content: Record<string, unknown>` (not `question_text`); `QuizQuestionOption.content: string` (not `text`); `QuizAttempt.total_score` (not `score`); `QuizAttemptResponse` has NO `first_question` (questions arrive via WebSocket).
- **shadcn Select usage**: All `<select>` elements should use shadcn `<Select>` from `@/components/ui/select` for theme consistency. Value is always `string` — convert to/from domain types explicitly (e.g., `String(id)` / `Number(v)` for numeric IDs).
- **Quizzes navigation**: `UserLayout` accepts `quizzesLabel: string` prop; Quizzes link appears in both sidebar and top navbar. All `UserLayout` call sites must pass this prop.
- **`me/account` PATCH returns `User` not `UserProfile`**: `PATCH /api/users/me/account/` response is `UserSerializer` shape (`id`, `username`, `email`, …). Frontend `AccountForm` handles this distinct response and exposes `onAccountUpdated(user: User)` callback.
- **MSW handler ordering for admin routes**: Register `adminUsersHandlers` BEFORE `usersHandlers` in `index.ts`; even though `/api/admin/users/` and `/api/users/` are distinct paths, more-specific admin handlers should always be registered first to avoid accidental glob shadowing.
- **i18n key scoping in hooks**: Error message keys stored in hook state must be relative to the hook's namespace (e.g., `errors.loadFailed`), NOT fully-qualified (e.g., `adminUsers.errors.loadFailed`). `useTranslations('adminUsers')` already scopes `t()` — prepending the namespace causes double-namespace resolution.
- **useAdminUsers filter-persistence pattern**: Hook stores `activeParams` so mutations (`submitToggleActive`, `submitCreateUser`) can call `loadUsers({ ...activeParams })` to refresh the list without resetting the user's current filter/page state.
- **MSW handler ordering for user routes**: Register `/me/*` and `/:username/profile` handlers BEFORE the wildcard `/:id/` handler to prevent MSW from capturing `"me"` as a numeric ID parameter.
- **Deferred profile sections pattern**: Password-change and SSO-identity sections are rendered as `opacity-60` cards with informational `CardDescription` — no API calls wired; activate when Task 1.4 and SSO enhancement are ready.
- **Auth session storage**: Track refresh tokens in `user_session` using hashed values only.
- **Auth refresh rotation**: `POST /api/auth/token/refresh` revokes matched active session, mints new access/refresh pair, and creates a new hashed `user_session` record atomically.
- **Frontend session-current heuristic**: when auth session API does not expose `is_current`, detect current session deterministically from backend ordering (`last_used_at` descending, fallback `id` descending) and block revoke for that selected row in both UI and hook logic.
- **Refresh anti-abuse**: Per-user cache key `refresh_rate:{user_id}` blocks refresh requests after 10 hits within 60 seconds.
- **SSO callback anti-replay**: Cache key `sso:state:{state}` stores nonce for 5 minutes and is consumed once during callback validation.
- **Account linking policy**: Resolve by `(provider, external_id)` first; fallback to email-based linking only when `auth.link_accounts_enabled=true`; return conflict when an external identity belongs to a different user.
- **SSO tests**: OIDC discovery/code exchange/id_token decode are mock-driven in unit tests so CI does not require a live Authentik instance.
- **Frontend API usage**: Components/hooks must call `src/services/*` only; Axios client/interceptors stay centralized in `src/lib/axios.ts`.
- **Frontend RBAC list normalization**: RBAC list services should accept either bare arrays or DRF paginated `{ count, next, previous, results }` payloads and normalize to arrays before state updates.
- **Frontend auth persistence**: Auth tokens persist via Zustand persist + localStorage (`auth.store.ts`) and sync with Axios interceptor refresh flow.
- **Frontend i18n routing**: Locale-first URLs (`/vi/*`, `/en/*`) with `vi` as default and root redirect from `/` to `/vi`.
- **Frontend mock runtime**: MSW worker starts in browser through `MswProvider` when `NEXT_PUBLIC_ENABLE_MSW=true`; production default is disabled.
- **Frontend CSS baseline**: Keep global imports minimal (`tailwindcss`, `tw-animate-css`) and avoid extra framework package CSS imports unless explicitly required by the active toolchain.
- **Frontend style consistency**: Prefer shared primitives (`Button`, `Card`, `Input`, `Label`) over ad-hoc utility compositions; keep auth/dashboard/home surfaces aligned to the project square style language (`rounded-none` + tokenized ring/border usage).
- **Permission discovery naming**: normalize class name to `resource_name` by stripping `ViewSet`/`View`/`APIView`/`GenericViewSet` and snake_case lowercasing; use Python handler action name as `handler_method_name`.

## Key DB Decisions

### 2026-03-09 schema review
- **Quiz↔QuizNode**: one-way FK — `quiz_node.quiz_id → quiz`. Access node from quiz via `quiz.node` (reverse accessor)
- **Quiz.category_id** → quiz_category (added)
- **challenge.slug** — unique URL identifier (required)
- **lesson.title** — direct lesson title (required)
- **BaseNode** includes `position` — challenge_node, quiz_node, course_node all have ordering
- **lesson_question.position** — ordering within miniquiz
- **ChallengeInstance**: `expires_at` (TTL), `challenge_flag_id` (which flag template), partial unique index on (user, challenge) WHERE status='running'
- **user_quiz_progress** — aggregate table: best_score, attempt_count, timestamps; sync via signal
- **quiz_question.case_sensitive** — single source of truth; quiz_question_answer has NO is_case_sensitive
- **quiz_config**: UNIQUE (quiz_id, user_id)
- **user_quiz_answer**: UNIQUE (attempt_id, question_id)
- **notification_type** enum: manual/auto_challenge_complete/auto_course_complete/auto_quiz_complete/system
- **user_notification**: notification_id NOT NULL, user_id NOT NULL

### 2026-03-12 design review
- **Permission**: flat (no parent_id, no pre_path); name format `{app_label}.{resource_name}.{handler_method_name}` (lowercase); read-only via API
- **role.is_system**: TRUE for built-in roles (Admin/Editor/Member) — cannot delete/rename via API
- **user_permission**: deny-only (no is_granted column); only valid if user has permission via role
- **user_permission_cache.encoded_permissions**: TEXT (base64 bitmap), not JSONB
- **user.permission_version**: per-user INT (removed global system_config key)
- **BaseNode.path**: dot-separated e.g. `"1.3"` (replaces `pre_path` with `/1/3/10/` format)
- **lesson.status**: `content_status NOT NULL DEFAULT 'draft'`
- **quiz_question.status**: `content_status NOT NULL DEFAULT 'draft'`

## Requirements

Full requirements documented in `REQUIREMENTS.md` (converted from `requirements.docx`).
Key requirements by domain:
- **Auth:** SSO (Authentik) + native login; admin configures enabled methods
- **AuthZ:** API-based flat RBAC; `@add_role_granted` decorator; binary bitmap permissions in JWT; deny-only user_permission; per-user permission_version; read-only permission API
- **Learn:** Course-folder-lesson tree; Outline integration; dot-separated `path`; lazy loading; progress tracking; lesson status (draft/published/archived)
- **Challenge:** GitLab import; flag check on server; deployable instances via Strategy pattern (SocketDeploymentBackend; separate project)
- **Quiz:** WebSocket answer→check→next; single/multi/fill-in-blank; user session config
- **User:** Profile page + settings page
- **Notification:** Admin manual broadcast + auto (course/challenge/quiz complete)
- **Statistics:** Leaderboard + admin detailed stats

## Documentation

| Path | Purpose |
|------|---------|
| `docs/DATA_MODEL.md` | **Entity types, validation rules, storage schema, business rules** |
| `docs/ARCHITECTURE.md` | **System design, folder structure, data flows, design decisions, what NOT to do** |
| `docs/DECISIONS.md` | **Open questions + resolved decisions — must check before any slice** |
| `docs/prd/README.md` | PRD index with all 10 features |
| `docs/prd/01-authentication.md` | Auth PRD (SSO + native, JWT sessions) |
| `docs/prd/02-authorization.md` | RBAC PRD (permissions, roles, JWT claims) |
| `docs/prd/03-learn.md` | Learn PRD (courses, lessons, Outline) |
| `docs/prd/04-challenge.md` | Challenge PRD (CTF, flags, GitLab, instances) |
| `docs/prd/05-quiz.md` | Quiz PRD (WebSocket practice, 3 question types) |
| `docs/prd/06-user-profile.md` | Profile PRD (stats, settings) |
| `docs/prd/07-notification.md` | Notification PRD (broadcast + auto) |
| `docs/prd/08-statistics.md` | Statistics PRD (leaderboard, admin stats) |
| `docs/prd/09-ai-assistant.md` | AI PRD (3 modes, rate limit, LLM integration) — DEFERRED |
| `docs/prd/10-system-config.md` | System Config PRD (runtime KV store) |

## Document Dependency Tree

Tier hierarchy (Tier 1 = source of truth, Tier 6 = aggregated index):

```
Tier 1 (human-authored, require human decision):
  docs/REQUIREMENTS.md  ←→  docs/prd/*.md    [SIBLINGS — update together]
    REQUIREMENTS = basic ideas/scope (genesis doc)
    prd/*.md = detailed analysis/acceptance criteria
  docs/DECISIONS.md      (open questions + resolved decisions)

Tier 2 (core design):
  docs/DATA_MODEL.md    ← AUTHORITATIVE for all entity/schema (DATA_MODEL wins conflicts)
  docs/ARCHITECTURE.md  ← REQUIREMENTS + prd/*.md + DECISIONS
  docs/CONFIG.md        ← prd/10-system-config.md + DECISIONS

Tier 3 (implementation reference):
  backend/api/models.py          ← DATA_MODEL.md (primary)
  design/database/vx/dbv3.sql   ⚠️ LEGACY ARTIFACT — pre-normalization; no longer authoritative

Tier 4 (planning):
  docs/IMPL_PLAN.md     ← ARCHITECTURE + DATA_MODEL + DECISIONS

Tier 5 (living trackers):
  docs/STATUS.md        ← mirrors IMPL_PLAN.md
  docs/BUGS.md          ← cross-refs backend code

Tier 6 (agent index):
  AGENT.md + openmemory.md
```

**Conflict resolution:** DATA_MODEL.md > models.py | REQUIREMENTS ↔ prd/*.md (siblings, must agree) | DECISIONS.md(RESOLVED) > ARCHITECTURE.md > IMPL_PLAN.md | dbv3.sql = legacy, always loses
**Propagation rule:** Parent change MUST propagate to dependents in same session, or defer to a named normalization session tracked in STATUS.md.
**OPEN question in DECISIONS.md = BLOCKER — never implement past an open question.**
**Full propagation guide in AGENT.md §Document Dependency Tree.**
| `DEV_WORKFLOW.md` | **Dev session workflow** — checklist for all devs: pick task → plan → code → update docs → commit |

## User Defined Namespaces

- backend
- frontend
- database
- auth
- ai
