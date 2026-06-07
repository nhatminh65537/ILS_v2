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
| `backend/api/models.py` | All ORM models (~2059 lines) |
| `backend/ai/` | ⚠️ DEFERRED — AI assistant scaffold (not active, not in INSTALLED_APPS) |
| `backend/backend/settings.py` | Django config (SQLite dev, PostgreSQL commented out) |
| `docs/STATUS.md` | Implementation status per slice |
| `docs/BUGS.md` | Known bugs and fix history |
| `docs/CONFIG.md` | Canonical system_config keys |
| `docs/API.md` | Canonical API reference by implementation progress |
| `CLAUDE.md` | AI agent quick-reference guide (canonical; absorbs former AGENT.md) |

## Components

- **password reset + EmailService (Slice 1 Task 1.4B, 2026-06-07)**: `PasswordResetService` (`backend/auth_app/services/password_reset_service.py`) — stateless **single-use** `itsdangerous.TimestampSigner(SECRET_KEY, salt='auth.password-reset')`, 1h, no DB (R-AUTH-02); payload `"{pk}:{HMAC(SECRET_KEY,user.password)[:16]}"` so token dies on any password change (Django `PasswordResetTokenGenerator` style). `EmailService` (`backend/auth_app/services/email_service.py`) builds a Django SMTP connection per send, reading settings **only from the `auth.email.*` system_config rows** (all `is_runtime=true`; env not consulted; no console fallback — empty host ⇒ no send + warning); swallows all exceptions so SMTP failure never 500s. `.env` bootstraps the rows via `seed_config` (fill-while-empty, create-only guard `_VALUE_CREATE_ONLY_KEYS`). `PasswordResetRequestView`/`PasswordResetConfirmView` (anti-enumeration always-200, per-email 3/h limit, SSO-only skip via `has_usable_password() and user.password`). Shared `auth_app/validators.validate_password_policy` now used by change + reset confirm serializers. FE: `ChangePasswordForm` (profile), `ForgotPasswordForm`/`ResetPasswordForm` (auth), service fns in `auth.service.ts`, `user.types.ts` payloads, `auth-error-map` branches, en/vi i18n.
- **frontend admin Challenge editor (Slice 6 Task 6.7, 2026-05-02)**: Admin surface routes `/{locale}/admin/challenges`, `/new`, `/{slug}`, `/{slug}/flags`, `/instances` implemented with challenge list/create/editor (tabs: Metadata, Tree, Flags link), flag manager, and instance manager. Hooks: `useAdminChallenges`, `useAdminChallengeTree` (global tree — no slug scope), `useAdminChallengeFlags`. Challenge tree is global unlike Learn tree (per-course); `AdminChallengeTreeTab` exposes folder + challenge-node creation forms. MSW: `adminChallengesHandlers` covering categories, tags, nodes, flags, instances. i18n: `adminChallenges.*` namespace in vi/en. GitLab sync tab deferred to Task 6.8.
- **challenge flag CRUD API (Slice 6 Task 6.3, 2026-05-02)**: `/api/challenge/challenges/{slug}/flags/` (GET list, POST create) and `/api/challenge/challenges/{slug}/flags/{id}/` (PUT/PATCH/DELETE) under `LearnChallengeViewSet`. Static flags stored as HMAC-SHA256 (lowercased before hashing when `is_case_sensitive=false`); regex flags stored as plaintext. `flag_value` omitted from responses for non-Admin/Editor via `ChallengeFlagSerializer.to_representation()`. 14 integration tests in `backend/api/tests/test_challenge_flag_api.py`, all passing.
- **challenge node tree API (Slice 6 Task 6.2, 2026-04-30)**: Namespaced `/api/challenge/nodes/*` CRUD + lazy `children` endpoint, cycle-safe `move`, and serializer invariants (`is_item` vs `challenge` linkage, item nodes cannot be parents). Integration tests added in `backend/api/tests/test_challenge_node_api.py`.
- **frontend leaderboard page (Slice 11 Task 11.3, 2026-04-30)**: User surface route `/{locale}/leaderboard` is now implemented as a Next.js server entry plus client leaderboard view, consuming canonical `/api/stats/leaderboard/` with tab switcher (`overall`, `challenge`, `quiz`, `course`), my-rank summary, current-user row highlight, pagination, and MSW parity; navigation link was intentionally kept out of Task 11.3 scope.
- **admin notification broadcast + history console (Slice 9 Task 9.5, 2026-04-20)**: Admin surface route `/{locale}/admin/notifications` now supports manual broadcast creation and grouped history listing; backend adds `GET /api/admin/notifications/history/` and extends `POST /api/admin/notifications/broadcast/` with `broadcast_batch_key`, persisting batch identity via `notification.event_key` (`broadcast:{uuid}`) and sender via `created_by`.
- **frontend notifications bell + inbox (Slice 9 Task 9.4, 2026-04-20)**: User surface now includes `NotificationBell` in session navbar controls with unread badge + latest-5 dropdown, dedicated inbox route `/{locale}/notifications` via `NotificationsInboxClient`, and reusable hooks `useNotifications` + `useNotificationSocket` wired to `/ws/notifications/` first-message JWT auth.
- **slice 7 checklist follow-up (2026-04-20)**: Slice 7 quiz follow-up fixed false-negative browser artifacts in `frontend/playwright.slice7.checklist.test.ts` and `frontend/scripts/slice7-diagnostics.mjs`, aligned default quiz-config creation to `random_question=false` / `random_option=false`, made empty published quizzes finish immediately with `0/0` over WebSocket, and updated `frontend/src/hooks/useQuizSession.ts` to prefer `NEXT_PUBLIC_WS_URL` with close-code-aware error mapping.
- **admin surface token gate (2026-04-19)**: backend `TokenService` now emits JWT claim `admin_surface` for users with built-in `Admin` or `Editor` roles; frontend admin route guard and admin login consume this claim to deny member accounts before rendering admin pages.
- **slice 1-4 browser regression pass (2026-04-20)**: real-backend Playwright validation for auth/admin/config flows is stable only when the frontend is executed with `npm run build` + `npm run start`; `next dev` was too unstable for deterministic browser verification in this repo.
- **frontend admin Learn editor (Slice 5 Task 5.7)**: Admin surface routes `/{locale}/admin/learn/courses`, `/new`, `/{slug}`, and `/{locale}/admin/learn/lessons/{id}` implemented with course list/create/edit, taxonomy inline CRUD (category/tag dialogs), tree authoring (folder/lesson node create, rename, move, reorder, delete), and lesson tabs (`markdown`, `video`, `miniquiz`, `outline`).
- **Outline content sync (Slice 5 Task 5.8)**: Server-mediated `OutlineService` (`backend/api/services/outline_service.py`, stdlib `urllib`, WAF-safe User-Agent — Cloudflare 403s the default `Python-urllib` UA) calls Outline's RPC API (`collections.list`/`documents.list`/`documents.info`). Endpoints `GET /api/learn/outline/collections/`, `GET …/documents/`, `POST /api/learn/lessons/{id}/outline/` (link+import), `POST …/sync-outline/`, `DELETE …/outline/` (Admin/Editor). `LessonService.link/sync/unlink_outline` updates `lesson.content_md`+`source` and `lesson_outline`; document fetch precedes the DB write so an Outline failure → 503 with old content preserved (Q-LEARN-10). FE `AdminLearnLessonOutlineTab` = collection→document picker with link/sync/unlink + editor-only source link; `outline_info` on the lesson detail serializer.
- **api app**: All domain models and current domain viewsets for users, courses, lessons, challenges, quizzes, notifications, leaderboard, and system config.
- **frontend lesson viewer (Slice 5 Task 5.6)**: User lesson route `/{locale}/courses/{slug}/lessons/{id}` delivered with `LessonViewerClient`, type-specific renderers (`LessonMarkdownContent`, `LessonVideoContent`, `LessonMiniQuizContent`), sidebars (`LessonCourseTreeSidebar`, `LessonProgressSidebar`), and canonical lesson API service (`lessons.service.ts`).
- **frontend learn catalog + lazy tree (Slice 5 Task 5.5)**: User-facing course routes `/{locale}/courses` and `/{locale}/courses/{slug}` delivered with client components (`CourseCatalogClient`, `CourseDetailClient`, tree panel/node renderer), domain hook/store (`useCourses`, `courses.store`), and namespaced Learn service contract (`/api/learn/*`).
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

- Slice 1 Task 1.4B completed on 2026-06-07: password reset (BE+FE) is active. `POST /api/auth/password/reset/` (anti-enumeration — always 200, per-email rate limit 3/h, SSO-only accounts skipped via non-blank-password check) + `/reset/confirm/` (stateless **single-use** `itsdangerous` token salt `auth.password-reset`, 1h, no DB — R-AUTH-02; payload `pk:HMAC(SECRET_KEY,user.password)[:16]` dies on any password change, Django-style; revokes all sessions). New `EmailService` reads SMTP **only from `auth.email.*` config** (env not consulted; no console fallback; never raises) — `.env` bootstraps those rows via `seed_config`; new `PasswordResetService`; shared `auth_app/validators.validate_password_policy`; `DJANGO_SECRET_KEY` + `FRONTEND_URL` wired from env. FE: `forgot-password`/`reset-password` pages + forms, login "Forgot password?" link, `ChangePasswordForm` wired into profile settings (replaced placeholder, forced re-login on success). 11 backend tests (`auth_app/tests/test_password_reset.py`); `tsc`/`eslint` clean.
- Slice 5 Task 5.8 completed on 2026-06-06: Outline content sync is active. Server-mediated `OutlineService` + endpoints `/api/learn/outline/{collections,documents}/` and `/api/learn/lessons/{id}/{outline,sync-outline}/`; synchronous-blocking with 503-preserves-content (Q-LEARN-10), server-mediated token handling (Q-LEARN-06); FE Outline tab (collection→doc picker, link/sync/unlink), i18n en/vi, MSW handlers; 13 backend tests + live HTTP E2E vs `collab.n3m3s1s.org`. ⚠️ Cloudflare blocks default `Python-urllib` UA — service sends a custom User-Agent.
- Slice 6 Task 6.7 completed on 2026-05-02: frontend admin challenge editor is active at `/{locale}/admin/challenges/*`; global challenge tree (no slug scope) with folder/node CRUD; flag manager per slug; instance kill panel; `adminChallenges.*` i18n (vi+en); MSW `adminChallengesHandlers`; GitLab sync tab deferred to 6.8.
- Slice 6 Task 6.3 completed on 2026-05-02: ChallengeFlag CRUD API is active; static flags HMAC-SHA256 stored, regex flags plaintext; `flag_value` omitted for non-Admin/Editor; 14 integration tests pass (`pytest backend/api/tests/test_challenge_flag_api.py`).
- Slice 6 Task 6.2 completed on 2026-04-30: ChallengeNode tree API is active under `/api/challenge/nodes/*` with lazy children, cycle-safe move, and admin/editor write gates; integration tests pass (`pytest backend/api/tests/test_challenge_node_api.py`).
- Slice 11 Task 11.3 completed on 2026-04-30: frontend leaderboard page is active at `/{locale}/leaderboard` with canonical `/api/stats/leaderboard/` contract, tab switcher, my-rank summary, row highlight, pagination, and MSW alignment; leaderboard navigation entry remains intentionally out of scope.
- Slice 9 Task 9.5 completed on 2026-04-20: expanded full-stack delivery is active with admin broadcast submit UI + broadcast history table, backend grouped history API (`/api/admin/notifications/history/`), and extended broadcast response (`recipient_count`, `broadcast_batch_key`); validation passed (`pytest backend/api/tests/test_notification_api.py`, `npm run lint`, `npx tsc --noEmit`, `npm run build`).
- Slice 9 Task 9.4 completed on 2026-04-20: frontend notification inbox route is implemented, realtime bell/inbox updates are active with socket auth flow, and frontend notification contracts are normalized to hyphenated API endpoints (`mark-read`, `mark-all-read`, `unread-count`) with MSW parity; validation gates (`tsc --noEmit`, `lint`, `build`) pass.
- Slice 7 checklist follow-up completed on 2026-04-20: code and local diagnostics are aligned for protected quiz-route auth setup, canonical Slice 7 credentials, empty-quiz WS finish behavior, default quiz-config flags, and WS env/error handling; a full browser rerun of BRW-701..724 is still pending before checklist cases can be upgraded to PASS.
- Slice 1-4 browser regressions closed on 2026-04-20: combined real-backend Playwright coverage now passes `22/22` after fixing admin-route hydration timing, updating stale browser credentials/selectors, and restoring deterministic non-editable config seed coverage via `challenge.upload_path`.
- Admin surface token-guard bugfix completed on 2026-04-19: frontend admin route gating no longer relies on authenticated-only state; `admin_surface` JWT claim now controls route-level access and closes prior H3/H7 regressions for member access to admin surface and unstable `/admin/users` verification.
- Slice 5 Task 5.7 completed on 2026-04-16: frontend admin Learn course editor is active with canonical admin routes, typed service/hook orchestration, quiz-filtered mini-quiz mapping flow (`/api/quiz/quizzes/` -> `/api/quiz/quizzes/{id}/questions/` -> `/api/learn/lessons/{id}/questions/`), i18n parity (`adminLearn.*` in en/vi), and MSW write-contract coverage; validation gates (`lint`, `tsc --noEmit`, `next build`) pass.
- All domain ORM models complete; API layer is partially implemented and tracked in `docs/API.md`
- Slice 5 Task 5.6 completed on 2026-04-15: frontend lesson viewer is active on `/{locale}/courses/{slug}/lessons/{id}` with explicit start/complete actions (`/api/learn/lessons/{id}/progress/start|complete/`), guided completion signals by lesson type (markdown/video/miniquiz), deterministic prev/next navigation derived from flattened course tree, and lesson API/MSW alignment (`/api/learn/lessons/*`); frontend validation gates (`lint`, `tsc --noEmit`, `next build`) pass.
- Slice 5 Task 5.5 completed on 2026-04-15: frontend course catalog + lazy tree is active on canonical catalog routes (`/{locale}/courses`, `/{locale}/courses/{slug}`) with namespaced Learn client services, lazy children loading (`/nodes/{id}/children/`), progress card integration, and en/vi i18n parity updates; frontend validation gates (`lint`, `tsc --noEmit`, `next build`) pass.
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
- Slice 4 Frontend Foundation implemented on 2026-03-31: typed contracts + services, Zustand store scaffolding, MSW handlers/fixtures/provider, next-intl (`vi` default, `en` secondary) locale routing, and baseline UI primitives/documents (`FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md` — later merged into `docs/FRONTEND.md` by doc normalization 2026-05-14).
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

- **Challenge flag storage pattern**: Static flags are stored as `hmac.new(SECRET_KEY, value.encode(), sha256).hexdigest()` — lowercase before hashing when `is_case_sensitive=false`; regex flags are stored as plaintext patterns. `flag_value` is always omitted from serializer output for non-Admin/Editor users via `to_representation()`. Editors who lose a raw static flag must delete and re-create (no recovery from hash).
- **Broadcast history grouping pattern**: For admin broadcast history, persist a deterministic batch key in `notification.event_key` (`broadcast:{uuid}`) on every per-recipient row and group by that key when listing history so UI can display one logical broadcast event with aggregated `recipient_count` and sender projection.
- **Frontend notification contract-alignment pattern**: For notification frontend delivery, update service endpoints, DTO types, store state reducers, and MSW handlers atomically to the same canonical API contract before UI rollout; partial alignment causes silent runtime drift (especially with action paths and mark-all response keys).
- **Checklist follow-up documentation pattern**: When a browser checklist run produced historical FAIL/BLOCKED rows but the underlying code is fixed later without a fresh end-to-end rerun, keep the historical matrix intact, append a dated follow-up section listing code fixes and validations, and mark the overall state as "retest pending" instead of upgrading cases to PASS prematurely.
- **Admin surface access pattern**: Use a backend-issued JWT claim such as `admin_surface` for route-level frontend gating of admin shells; do not depend on paginated permission-catalog fetches to decide whether a user can enter the admin surface.
- **Stable Playwright runtime pattern**: For real-backend browser validation in this repo, prefer `npm run build` + `npm run start` over `next dev`; the production server avoids the detached-frame / aborted-navigation instability seen in direct Playwright runs against the dev server.
- **System-config read-only acceptance pattern**: Keep at least one canonical seeded config with `is_editable=false` so Slice 3 acceptance and browser regression coverage can verify the read-only badge and hidden edit action against deterministic backend data.
- **Mini-quiz quiz-filter selector pattern (admin Learn)**: For lesson mini-quiz mapping, always select question in three deterministic steps: filter/load quizzes (`status`, `search`) -> load questions for selected quiz -> attach selected question by `question_id`; avoid global question search endpoint assumptions.
- **Admin Learn tree mutation refresh pattern**: After node create/move/reorder/delete, refresh tree state deterministically (root + cached branch invalidation) so client ordering/path displays stay consistent with backend canonical node order.
- **Dot-separated `path`** for all tree structures (e.g., `"1.3"`) — lazy loading via `parent_id` filter is primary; `path` for depth/validation only
- **Lesson viewer guided-signal pattern**: Keep completion hints local and deterministic by lesson type (`markdown` scroll %, `video` watch %, `miniquiz` revealed answers) while still requiring explicit user action for `/progress/complete/` (hybrid UX per Q-LEARN-08 + Q-LEARN-09).
- **Lesson prev/next derivation pattern**: Build deterministic neighbor links by fully expanding course tree nodes once, flattening lesson nodes with stable `position` then `id` ordering, and resolving neighbors against current `lessonId`.
- **Learn catalog lazy-tree frontend pattern**: For `/{locale}/courses/{slug}`, fetch root nodes once, cache children by `parentId`, and only request `/nodes/{id}/children/` on first folder expansion; preserve expanded-node state and per-node loading flags in domain store.
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
- **Catalog route group pattern**: Feature pages with content filter panels (quizzes, courses, challenges) live under `(catalog)` route group with `showSidebar=false`. Each `*CatalogClient.tsx` renders its own two-column layout (sticky `w-56` filter panel left + content grid right) — no sidebar injection through layout hierarchy. See `docs/FRONTEND.md` §2 — Catalog Route Group Pattern section.
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
| `DEV_WORKFLOW.md` | Dev session workflow — checklist for all devs: pick task → plan → code → update docs → commit |

## Document Dependency Tree

See `CLAUDE.md` §"Document Dependency Tree" for the canonical Tier hierarchy, conflict resolution rules, and update propagation guide. Mirroring it here would drift; this file holds only OpenMemory-specific notes (Components / Patterns / Status).

## User Defined Namespaces

- backend
- frontend
- database
- auth
- ai
