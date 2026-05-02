# STATUS.md — ILS v2 Implementation Status

> Living document. Update after each completed slice or major task.
> Last updated: 2026-05-02 (Slice 6.7 Frontend Challenge admin editor delivered)

Release docs gate for upcoming slices:
- `docs/RELEASE_CHECKLIST_SLICE5_8.md` is the required consistency checklist before opening Slice 5-8 implementation PRs.

---

## ✅ CRITICAL BLOCK — RESOLVED (2026-03-24)

Four critical questions from Slice 1 planning were resolved and no longer block Tasks 1.1–1.5.

| Question | Blocks | Status |
|----------|--------|--------|
| [Q-SLICE1-01](DECISIONS.md#q-slice1-01-member-role-seeding) — Member role seeding | Slice 0 (Task 0.3), Slice 1 (Task 1.1) | **RESOLVED** (Option A) |
| [Q-INFRA-01](DECISIONS.md#q-infra-01-frontend-source-directory) — Frontend src/ layout | Slice 1 (Task 1.5), Slice 4–11 | **RESOLVED** (Option A) |
| [Q-AUTH-04](DECISIONS.md#q-auth-04-jwt-token-expiry-and-refresh-strategy) — Token expiry + refresh window | Slice 1 (Tasks 1.2, 1.5) | **RESOLVED** (Option A) |
| [Q-AUTH-05](DECISIONS.md#q-auth-05-first-login-admin-ceremony) — Admin first-login credentials | Slice 0 (new Task 0.4), Slice 1 | **RESOLVED** (Option C) |

---

## ⚠️ Pre-Implementation Gate (Resolved 2026-03-23)

**Slice 0 and Slice 1 foundation questions — now RESOLVED.** Full details in **`docs/DECISIONS.md`**.

| Question | Blocks | Status |
|----------|--------|--------|
| [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — URL prefix convention | All API slices | **RESOLVED** |
| [Q-AUTH-01](DECISIONS.md#q-auth-01-default-role-for-new-users) — Default role for new users | Slice 1–2 | **RESOLVED** |
| [Q-AUTH-02](DECISIONS.md#q-auth-02-first-admin-creation-mechanism) — First admin creation | Slice 0 | **RESOLVED** |
| [Q-INFRA-04](DECISIONS.md#q-infra-04-cache-backend-for-rate-limiting) — Cache backend | Slice 1 | **RESOLVED** |
| [Q-INFRA-03](DECISIONS.md#q-infra-03-email-backend-for-password-reset) — Email for password reset | Slice 1 | **RESOLVED** |
| [Q-INFRA-06](DECISIONS.md#q-infra-06-client-side-token-storage) — Token storage | Slice 1, 4 | **RESOLVED** |
| [Q-AUTH-03](DECISIONS.md#q-auth-03-sso-only-lockout-fallback) — SSO-only lockout fallback | Slice 1 | **RESOLVED** |

---

## 📋 Future Blockers (Resolve Before Task Implementation)

| Question | Blocks | Status |
|----------|--------|--------|
| [Q-AUTH-06](DECISIONS.md#q-auth-06-sso-account-linking-strategy) — SSO account linking strategy | Slice 1 (Task 1.3) | **RESOLVED** (Option A) |
| [Q-AUTH-07](DECISIONS.md#q-auth-07-device-logout-granularity) — Device logout granularity | Slice 1 (Task 1.4 deferred) | **RESOLVED** (Option A) |
| [Q-INFRA-09](DECISIONS.md#q-infra-09-cors-and-domain-configuration) — CORS + domain configuration | Slice 1 (Task 1.5) | **RESOLVED** (Option A) |
| [Q-ARCH-01](DECISIONS.md#q-arch-01-max-permissions-bitmap-capacity) — Max permissions bitmap size | Slice 2+ | **RESOLVED** (Option B) |
| [Q-CONFIG-01](DECISIONS.md#q-config-01-default-systemconfig-auth-values) — Default system config seed values | Slice 0 (Task 0.3), Slice 1 | **OPEN** |
| [Q-INFRA-07](DECISIONS.md#q-infra-07-i18n-language-strategy) — i18n strategy | Slice 4 | **RESOLVED** (Option C) |
| [Q-INFRA-08](DECISIONS.md#q-infra-08-frontend-ui-component-library) — UI component library | Slice 4+ | **RESOLVED** (Option A) |
| [Q-LEARN-01](DECISIONS.md#q-learn-01-lesson-node-creation-atomicity) — Lesson node atomicity | Slice 5 | **RESOLVED** |
| [Q-LEARN-02](DECISIONS.md#q-learn-02-mini-quiz-question-source) — Mini-quiz question source | Slice 5 | **RESOLVED** |
| [Q-LEARN-03](DECISIONS.md#q-learn-03-course-progress-on-structure-change) — Course progress on structure change | Slice 5 | **RESOLVED** |
| [Q-LEARN-04](DECISIONS.md#q-learn-04-course-delete-strategy) — Course delete strategy | Slice 5 | **RESOLVED** |
| [Q-LEARN-05](DECISIONS.md#q-learn-05-slug-conflict-resolution) — Slug conflict resolution | Slice 5 | **RESOLVED** |
| [Q-LEARN-06](DECISIONS.md#q-learn-06-outline-url-frontend-exposure) — Outline exposure and backend mediation | Slice 5 | **RESOLVED** |
| [Q-LEARN-07](DECISIONS.md#q-learn-07-tag-creation-permissions) — Tag creation permissions | Slice 5 | **RESOLVED** |
| [Q-LEARN-08](DECISIONS.md#q-learn-08-lesson-completion-trigger) — Lesson completion trigger | Slice 5 | **RESOLVED** |
| [Q-LEARN-09](DECISIONS.md#q-learn-09-lesson-start-trigger) — Lesson start trigger | Slice 5 | **RESOLVED** |
| [Q-LEARN-10](DECISIONS.md#q-learn-10-outline-sync-failure-handling) — Outline sync failure handling | Slice 5 | **RESOLVED** |
| [Q-CHALL-01](DECISIONS.md#q-chall-01-challenge-instance-scope) — Challenge instances in MVP | Slice 6 | **RESOLVED** (Option C) |
| [Q-INFRA-05](DECISIONS.md#q-infra-05-websocket-jwt-auth-method) — WebSocket JWT auth | Slice 7 | **RESOLVED** |

---

## Completed

| Area | Notes |
|------|-------|
| Django project scaffold | Apps: `api`, `realtime` (active); `ai` (deferred — not in INSTALLED_APPS) |
| All domain ORM models | Challenge, Course, Quiz + tree nodes, flags, progress, instances (`backend/api/models.py`) |
| Abstract base models | `CreateAudit`, `UpdateAudit`, `FullAudit`, `SoftDeleteAudit`, `BaseNode`, `BaseCategory`, `BaseTag` |
| Database schema review | All CRITICAL/HIGH/MEDIUM/LOW issues resolved in `dbv3.sql` and `models.py` (2026-03-09) |
| Next.js scaffold | Default create-next-app; all runtime deps installed (Zustand, next-intl, Axios) |
| PRD documents | 10 feature PRDs in `docs/prd/` |
| Documentation suite | `ARCHITECTURE.md`, `DATA_MODEL.md`, `CONFIG.md`, `API.md`, `IMPL_PLAN.md`, `BUGS.md`, `STATUS.md`, `DECISIONS.md` |
| Dev infrastructure | `README.md`, `Makefile`, `requirements.txt`, `pytest.ini`, `conftest.py`, `.env.example`, `.gitignore` |
| settings.py | DRF + SimpleJWT + CORS + Channels config added |
| Code-doc consistency sync (2026-03-12) | Existing backend scaffold aligned with current docs for tree path (`path`), flat RBAC direction, deny-only user permission override, permission cache versioning, and system config schema; `manage.py check` passes |
| Slice 0 / Task 0.2 (2026-03-17) | Q-AUTH-02 resolved (Option B seed_admin), User domain aligned for Task 0.2: `UserSession` model added, `UserProfile` fields renamed/expanded to DATA_MODEL naming, initial migrations generated/applied, `manage.py check` passes |
| Slice 0 / Task 0.3 (2026-03-23) | `SystemConfig` aligned and indexed (`category`, `is_runtime`, `is_editable`), `seed_config` command implemented (42 canonical keys from `CONFIG.md`, excluding `ai.*` per current scope), `api.utils.get_config()` added, `InstanceService` switched to canonical `challenge.deploy.*` keys, migration + idempotent seed verified |
| Slice 0 / Task 0.3.5 (2026-04-01) | Added idempotent `seed_roles` bootstrap command (`Admin`, `Editor`, `Member`) with `--dry-run` support; auth runtime still keeps `get_or_create` fallback when assigning default Member role. |
| Slice 1 / Task 1.1 (2026-03-26) | New `auth_app` implemented and wired at `/api/auth/*` with native `register`, `login`, `logout`, `logout-all`; session hash storage in `user_session`; login rate-limit; endpoint tests added and passing (`6 passed`) |
| Slice 1 / Task 1.2 (2026-03-27) | `POST /api/auth/token/refresh/` implemented with session-hash validation, token/session rotation, per-user refresh rate limit (`10/min`), updated JWT access lifetime (`15m`), CORS dev frontend port (`4000`), and expanded auth tests (`15 passed`) |
| Slice 1 / Task 1.3 (2026-03-30) | SSO/AuthentiK backend endpoints implemented: `GET /api/auth/sso/redirect/`, `GET /api/auth/sso/callback/`, `POST /api/auth/identity/link/`; callback validates state/nonce with cache TTL, auto-links by `provider+external_id` and email fallback when linking is enabled, creates JWT session via existing TokenService flow, and adds auth test coverage (`22 passed`) |
| Slice 1 / Task 1.4A (2026-04-13) | Password change + session management APIs implemented: `POST /api/auth/password/change/`, `GET /api/auth/sessions/`, `DELETE /api/auth/sessions/{id}/`; password change validates current password and runtime policy (`auth.password.*`), then revokes all active sessions; session listing enforces active-session filter and hides token hash; revoke-by-id enforces ownership; focused auth test suite passes including new coverage. |
| Slice 1 / Task 1.5 (2026-04-01) | Frontend auth UI completed for locale routes (`/vi/login`, `/en/login`, `/vi/register`, `/en/register`) with interactive forms, auth service/hook integration, localized validation + API error mapping, SSO direct redirect flow, axios refresh-loop guard on auth endpoints, and style alignment with shared UI primitives. |
| Slice 2 / Task 2.1 (2026-03-30) | Permission auto-discovery implemented at startup via `auth_app.services.permission_discovery.discover_permissions()` with idempotent sync (`is_active` reset/reactivate), built-in role mapping from `@add_role_granted`, and normalized permission naming (`{app_label}.{resource_name}.{handler_method_name}` lowercase); tests added and passing in `auth_app/tests.py` |
| Slice 2 / Task 2.2 (2026-03-31) | Role/Permission CRUD API completed with canonical admin RBAC routes (`/api/admin/permissions/`, `/api/admin/roles/*`, `/api/users/{id}/roles/*`), admin-only access guards, action-level JWT permission-key checks when JWT auth context is present, and deterministic permission-cache invalidation for affected users on role-permission/user-role mutations; RBAC endpoint tests passing (`16 passed`). |
| Slice 2 / Task 2.3 + Handler Grants (2026-03-31) | Implemented permission bitmap cache + JWT claims (`permissions` base64 bitmap, `pv`), refactored `PermissionService` to flat ID-based compute and cache lifecycle, wired `TokenService` stub to live cache, added explicit handler-level role grants with precedence over class-level grants in discovery, and verified with auth test suites (now under `backend/auth_app/tests/`) passing. |
| Slice 2 / Task 2.4 (2026-04-01) | Frontend admin RBAC UI implemented for locale routes (`/vi/admin/rbac`, `/en/admin/rbac`, `/vi/admin/rbac/roles/{id}`, `/vi/admin/rbac/users/{id}/roles`) with typed RBAC service/hook layer, role CRUD/assignment flows, user-role assignment page, i18n coverage, and permission-aware rendering gates from JWT claims. |
| Slice 3 / Task 3.1 (2026-03-30) | System Config admin API implemented at `/api/admin/config/*` with grouped list response, key-based detail/update (`lookup_field=key`), PATCH type validation by `value_type`, secret masking (`***`), `is_editable=false` guard (`403`), cache invalidation after update, and pytest coverage (`9 passed`) |
| Slice 3 / Task 3.2 (2026-04-01) | Frontend System Config admin UI implemented for locale routes (`/vi/admin/config`, `/en/admin/config`) with typed service/hook architecture, category-grouped accordion rendering, value-type aware editors (`bool`, `int`, `string`, `json`, `secret`), secret update confirmation flow, i18n support, and dashboard navigation entry. |
| Frontend Admin Access Gate (2026-04-01 → 2026-04-19) | Initial temporary fix removed the unstable permission-catalog gate and kept auth-only guard; current implementation now uses backend-issued JWT `admin_surface` claim gating so member accounts cannot enter admin routes while Admin/Editor users retain stable access without permission-catalog coupling. |
| Admin surface token guard bugfix (2026-04-19) | Backend `TokenService` now emits `admin_surface` for Admin/Editor role membership; frontend admin routes and `/admin/login` consume that claim to reject non-admin-surface accounts immediately, closing active bugs H3/H7. |
| Slice 1-4 browser regression fix pass (2026-04-20) | Real-backend Playwright validation is now stable under `npm run build` + `npm run start`; admin route hydration no longer bounces valid admin/editor users away from protected admin pages; canonical config seed now includes deterministic non-editable key coverage (`challenge.upload_path`), and combined Slice 1-4 browser coverage passed (`22/22`). |
| Slice 7 checklist follow-up (2026-04-20) | Fixed false-negative Slice 7 browser artifacts (protected-route tests now log in before opening `/quizzes*`; diagnostics use seeded `admin1234`), aligned default quiz config to checklist contract (`random_question=false`, `random_option=false`), made empty published quizzes finish immediately with `0/0` over WebSocket, and updated frontend WS hookup to prefer `NEXT_PUBLIC_WS_URL` plus close-code-aware error mapping. Regression coverage: `backend/api/tests/test_quiz_api.py`, `backend/realtime/tests/test_quiz_consumer.py`, and targeted frontend lint all pass. |
| Backend Refactor Phase 1-4 (2026-04-01) | Refactored auth session lifecycle into `SessionService`, centralized auth/rbac constants, removed cross-service private calls in SSO, standardized RBAC action permission checks via mixin, extracted admin config/RBAC viewsets to `api/admin_views.py`, split the API monolith into `api/views/` domain modules (`users`, `courses`, `challenges`, `quizzes`, `notifications`, `leaderboard`), preserved route contract, and verified with focused pytest suites + `manage.py check`. |
| Slice 4 / Frontend Foundation (2026-03-31) | Foundation scaffold implemented: typed domain contracts and service layer (Tasks 1–2), Zustand stores + hooks, MSW fixtures/handlers/provider, next-intl locale routing (`vi` default, `en` secondary), shadcn base components, env flags for MSW, and frontend onboarding docs (`FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md`) |
| Frontend Surface Split + Admin Auth Entry (2026-04-01) | Implemented route-level user/admin surface separation with dedicated admin login (`/{locale}/admin/login`), removed admin-register flow, added full shell layouts (navbar/sidebar/content/footer) for user/admin protected surfaces, moved admin routes out of user route group, and aligned MSW handlers with backend RBAC/system-config contracts including JWT permission bitmap claims for frontend capability checks. |
| Slice 7 / Task 7.1 (2026-04-01) | Quiz backend API completed: canonical namespaced routes `/api/quiz/quizzes/*`, nested question CRUD, per-user quiz config endpoint, deterministic serializer validation for `single_choice`/`multi_choice`/`fill_blank`, and focused pytest suite (`backend/api/tests/test_quiz_api.py`) passing (`6 passed`). |
| Slice 7 / Task 7.2 (2026-04-01) | QuizNode tree API completed: `/api/quiz/nodes/*` CRUD with folder-only MVP, one-way quiz FK, cycle-safe move, lazy children, and integration tests passing. |
| Slice 7 / Task 7.3 (2026-04-01) | Django Channels WebSocket consumer implemented: `/ws/quiz/{quiz_id}/` + first-message JWT auth (Q-INFRA-05 Option B) + auth/start/answer/next/finish actions; attempt lifecycle with config snapshot, question sequencing, polymorphic validation/scoring reusing domain logic; async integration tests for auth/flow/edge-cases in `backend/realtime/tests/test_quiz_consumer.py`. |
| Slice 7 / Task 7.4 (2026-04-01) | Quiz progress tracking signal handler implemented: Django `post_save` signal on `UserQuizAttempt` automatically updates `UserQuizProgress` with aggregated `best_score`, `attempt_count`, `first_attempted_at`, `last_attempted_at`, and `completed_at` fields; signal handler idempotent and tested with 13 comprehensive pytest tests covering edge cases (perfect score detection, timestamp tracking, multi-user/multi-quiz separation). |
| Slice 8 / Task 8.2 (2026-04-02) | Admin user management API completed at `/api/admin/users/*` with list filters (`is_active`, `date_joined_from`, `date_joined_to`), optional-password admin create with default Member role assignment, detailed update responses (`user + profile + roles`), and immediate session revocation on disable; focused pytest suite `backend/api/tests/test_admin_users_api.py` passing (`5 passed`). |
| Slice 8 / Task 8.3 (2026-04-10) | Frontend profile pages implemented: `ProfileEditForm` (PATCH `/me/profile/`), `AppSettingsForm` (PATCH `/me/settings/`), `AccountForm` (PATCH `/me/account/`), `PublicProfileView` (public profile), `ProfileSettingsView` (settings orchestrator); pages `/profile/[username]` and `/profile/settings` wired and building; `/profile` redirects to settings; avatar dropdown updated to "Hồ sơ" (public view) + "Cài đặt" (settings); MSW mock coverage complete for all Task 8.1 endpoints; `tsc`, lint, and `next build` all pass. |
| Slice 8 / Task 8.5 (2026-04-13) | Frontend session management page implemented at `/{locale}/profile/sessions` with active session listing (`device_info`, `created_at`, `last_used_at`, `expires_at`), deterministic current-session highlight, protected current-session revoke guard, per-session revoke flow, bulk "revoke all other sessions" flow via `DELETE /api/auth/sessions/{id}/`, new i18n keys (`navigation.sessions`, `profile.sessions.*`), navigation link integration, and MSW auth session handlers; `tsc` and `next build` pass. |
| Slice 7 / Task 7.5 (2026-04-10) | Frontend quiz browser implemented: catalog page (`/quizzes`) with sticky filter panel (search, time-limit Select, tag pills), detail page (`/quizzes/[id]`) with metadata, progress card, and "Start" link; `useQuizzes` hook for catalog + detail data-fetching; full quiz type alignment with backend serializers (`time_limit_sec`, `quiz_point`, `total_questions`, removed `pass_score_percent`/`is_shuffled`); MSW fixtures/handlers updated to match; all native `<select>` elements replaced with shadcn `<Select>` across admin UI; `(catalog)` route group introduced with `showSidebar=false` layout — catalog pages render their own internal two-column filter+content layout; Quizzes added to navbar/sidebar navigation; `tsc`, lint, and `next build` all pass. |
| Slice 7 / Task 7.6 (2026-04-10) | Frontend WebSocket quiz session implemented: `useQuizSession` hook with `useReducer` state machine (`idle→connecting→authenticating→active→finished/error`), first-message JWT auth, full protocol (start/answer/next/finish); `QuizQuestionView` renders all 3 question types (RadioGroup/Checkbox/Input); `QuizAnswerResultCard` shows correct/incorrect feedback + explanation; `QuizFinishScreen` shows score/maxScore/%/duration with Back+TryAgain; `QuizSessionClient` orchestrates based on status+phase; RSC page at `app/[locale]/(catalog)/quizzes/[id]/session/page.tsx`; MSW v2 `ws` handler simulates full protocol using fixture data; shadcn `radio-group`, `checkbox`, `progress` installed; WS types added to `quiz.types.ts`; i18n keys added under `quizzes.session.*`; fixed MSW URL pattern (env-var-derived, not glob) and `onclose` now surfaces auth-rejection as error; `tsc` and `next build` both pass. |
| Slice 7 / Task 7.7 (2026-04-13) | Frontend quiz editor delivered on admin surface: new routes `/{locale}/admin/quizzes`, `/new`, `/{id}`, `/{id}/questions`; typed admin hooks (`useAdminQuizzes`, `useAdminQuizQuestions`) and canonical service methods (`/api/quiz/quizzes/*`) added; metadata create/update/delete flow, question CRUD for single/multi/fill_blank, deterministic reorder (position update), and member-style preview implemented; admin shell navigation now includes Quizzes; i18n namespaces (`admin.quizzes`, `adminQuizzes.*`) and MSW nested question handlers/permission fixtures updated; `lint`, `tsc`, and `next build` pass. |
| Bugfix pass (2026-04-14) | Fixed active FE/MSW bugs H2, M2, M4, M5, L3: admin quiz status filter now applies in MSW list handler, quiz Try Again enforces deterministic session remount, ICU interpolation restored for `{title}` and `{device}` in vi/en locale messages, account save button now disables when no effective changes; `lint` and `next build` pass. |
| Slice 7 integration validation snapshot (2026-04-14) | Added runnable requests-based integration runner at `integration-test/slice7/run_requests_integration.py` and executed against real backend (`54` checks: `46` pass, `8` fail). Browser sampling logged additional FE regressions (user quiz route redirect and admin surface gate bypass behavior). Findings tracked in `docs/BUGS.md` as H4/H5/M8/M9/M10 plus existing H3 reproduction. |
| Slice 8 integration validation snapshot (2026-04-14) | Added runnable requests-based integration runner at `integration-test/slice8/test_slice8_requests.py` and executed against real backend (`75` checks: `70` pass, `5` fail). Browser validation confirmed session/settings core UI works and logged route-level regressions for `/admin/users` and public profile route. Findings tracked in `docs/BUGS.md` as H6/H7/H8/M11/M12. |
| Permission system refactor (2026-04-14) | Unified all backend views into `api/views/`; added `derive_permission_key()` shared utility; `HasJWTPermission` auto-derives key from `view.__class__+action` matching scanner logic; removed `action_permission_map`, `RBACActionPermissionMixin`, `QuizActionPermission`, `admin_views.py`, `mixins/`; all ViewSets use `permission_classes = [IsAuthenticated, HasJWTPermission]`; fixed BUG H1 (SystemConfigViewSet IsAdminUser), H5 (QuizNodeViewSet RBAC mismatch), M1 (hardcoded strings); 112 tests pass. |
| Bugfix pass H4/H6/H8/M6/M7/M9/M10 (2026-04-14) | Backend: wired `/api/quiz/quizzes/{id}/progress/`, enforced admin-user `username/email` uniqueness, added `quiz_point >= 0` validation and quiz detail `category` payload, added regression tests in `backend/api/tests/test_quiz_api.py`. Frontend: moved public profile route to public surface (no auth redirect), added not-found dialog UX, fixed MSW public-profile/account uniqueness behavior, added username-change confirmation + forced re-login flow in account settings, and preserved field-level API errors in axios error normalization. |
| Backend bugfix pass M8/M11 + test split (2026-04-14) | Backend: fixed member quiz visibility hardening by enforcing published-only results for non-admin/editor regardless of `status` query (`backend/api/services/quiz_service.py`), added regression `status=draft` test in `backend/api/tests/test_quiz_api.py`; enforced enum validation for `/api/users/me/settings/` (`language: vi/en`, `theme: system/light/dark`) in `backend/api/serializers/user.py` with negative-case regression in `backend/api/tests/test_profile_api.py`; split monolithic tests into domain modules (`backend/api/tests/test_system_config_api.py`, `backend/api/tests/test_rbac_api.py`, `backend/api/tests/test_views_exports.py`, `backend/auth_app/tests/test_auth_sso_flow.py`, `backend/auth_app/tests/test_permissions_and_authz.py`) and kept focused suites passing. |
| Backend refactor closure (2026-04-14) | Finalized serializer package migration (`backend/api/serializers/` + `__init__.py` exports), extracted view logic into domain services (`backend/api/services/*`), normalized backend test layout to app-local `tests/` packages with `test_*.py` naming and updated discovery in `backend/pytest.ini`, refactored realtime quiz consumer internals for readability, and synchronized canonical docs (`BUGS`, `STATUS`, `IMPL_PLAN`, `ARCHITECTURE`). |
| Slice 5 / Task 5.1 (2026-04-15) | Implemented namespaced Learn CRUD APIs at `/api/learn/courses/*`, `/api/learn/categories/*`, `/api/learn/tags/*` with slug detail, member visibility hardening, user_progress payload, slug conflict 409 suggestions, hybrid archive/purge delete flow, and integration regression tests (`backend/api/tests/test_learn_course_api.py`). |
| Slice 5 / Task 5.2 (2026-04-15) | Implemented canonical Learn course node tree endpoints at `/api/learn/courses/{slug}/nodes/*` (root list + lazy children), editor/admin node writes (atomic `Lesson + CourseNode` create), max depth enforcement (`learn.max_tree_depth`), subtree delete lesson cleanup, bulk move descendant `path` updates via `bulk_update`, and structure_version bumping; integration tests in `backend/api/tests/test_learn_course_node_api.py`. |
| Slice 5 / Task 5.3 (2026-04-15) | Implemented canonical Learn Lesson endpoints at `/api/learn/lessons/{id}/` (GET/PUT) plus miniquiz question mapping endpoints (`/api/learn/lessons/{id}/questions/`, `/api/learn/lesson-questions/{id}/`); member visibility restricted to lessons whose owning course is `published`; editor/admin write gates; service layer helpers in `backend/api/services/lesson_service.py`; integration tests added in `backend/api/tests/test_learn_lesson_api.py` and executed in local `.venv` (pass). |
| Slice 5 / Task 5.4 (2026-04-15) | Implemented canonical Learn progress endpoints: `POST /api/learn/lessons/{id}/progress/start/`, `POST /api/learn/lessons/{id}/progress/complete/`, `GET /api/learn/courses/{slug}/progress/`; added `user_course_progress` cache/version fields (`completed_lessons_cache`, `total_lessons_cache`, `progress_percent_cache`, `last_computed_version`) with migration `0007`; added `LearnProgressService` + lesson-completion signal chain (`UserLessonProgress` -> `UserCourseProgress` -> `UserProfile` first-completion counters); unified legacy completion path (`/api/lessons/{id}/complete/`) to the same pipeline; added integration tests in `backend/api/tests/test_learn_progress_api.py` and ran Learn regression suites (pass). |
| Slice 5 / Task 5.5 (2026-04-15) | Implemented frontend course catalog + lazy tree delivery on canonical catalog routes: `/{locale}/courses` and `/{locale}/courses/{slug}` with namespaced Learn service contract (`/api/learn/courses/*`, `/nodes/*`, `/progress/`, `/categories/`, `/tags/`), Zustand courses store + `useCourses` orchestration, lazy child-fetch tree UI, i18n parity updates (`en/vi`), and MSW contract alignment; validation gates `lint`, `tsc --noEmit`, `next build` all pass. |
| Slice 5 / Task 5.6 (2026-04-15) | Implemented frontend lesson viewer delivery on canonical catalog route `/{locale}/courses/{slug}/lessons/{id}` with dedicated viewer orchestration (`LessonViewerClient`), lesson-type rendering (`markdown`, `video`, `miniquiz`), explicit start/complete actions (`/api/learn/lessons/{id}/progress/start|complete/`), guided completion signals, deterministic prev/next navigation from flattened course tree, localized error/loading states, and MSW lesson endpoint coverage (`/api/learn/lessons/*`); validation gates `lint`, `tsc --noEmit`, `next build` all pass. |
| Slice 5 / Task 5.7 (2026-04-16) | Implemented frontend admin Learn course editor surface on `/{locale}/admin/learn/*`: course list/create/editor pages, metadata + taxonomy inline CRUD, course tree authoring (folder/lesson node create, rename, move, reorder, delete), and lesson editor tabs (`markdown`, `video`, `miniquiz`, deferred `outline`); mini-quiz now supports quiz-filtered question selection (`/api/quiz/quizzes/` -> `/api/quiz/quizzes/{id}/questions/` -> attach mapping), with i18n parity (`adminLearn.*` in en/vi), MSW contract expansion for learn write endpoints, and frontend validation gates (`lint`, `tsc --noEmit`, `next build`) passing. |
| Slice 9 / Task 9.1 (2026-04-17) | Notification API implemented: `/api/notifications/` list ordered unread-first, `/api/notifications/{id}/mark-read/`, `/api/notifications/mark-all-read/`, `/api/notifications/unread-count/`, and admin `/api/admin/notifications/broadcast/`; broadcast creates one notification per active user; focused tests (`backend/api/tests/test_notification_api.py`) and RBAC regression (`backend/api/tests/test_rbac_api.py`) pass. |
| Slice 9 / Task 9.2 (2026-04-17) | Auto-trigger notifications implemented via backend signals and shared helper: course completion now emits `COURSE`, challenge completion emits `CHALLENGE`, quiz completion emits `QUIZ`; `event_key` deduplication added to `notification`; focused signal tests and adjacent regressions pass. |
| Slice 9 / Task 9.3 (2026-04-17) | WebSocket notification delivery implemented at `/ws/notifications/` with first-message JWT auth, timeout/failure close codes, per-user channel group `notifications_{user_id}`, and realtime push wiring from `NotificationService` (including signal-triggered notifications and admin broadcasts); async consumer tests added at `backend/realtime/tests/test_notification_consumer.py` and passing. |
| Slice 9 / Task 9.4 (2026-04-20) | Frontend notification bell + inbox implemented on user surface: `NotificationBell` integrated into session navbar controls with unread badge and latest-5 dropdown, inbox page delivered at `/{locale}/notifications` with mark single/all read actions, realtime socket hook for `/ws/notifications/`, and frontend contract normalization to hyphenated endpoints (`mark-read`, `mark-all-read`, `unread-count`) plus MSW alignment. Validation gates: `npx tsc --noEmit`, `npm run lint`, `npm run build` passed. |
| Slice 9 / Task 9.5 (2026-04-20) | Admin notification broadcast page implemented at `/{locale}/admin/notifications` with full create flow and broadcast history table; backend now provides grouped history endpoint `/api/admin/notifications/history/` and broadcast response includes `broadcast_batch_key`; broadcast rows persist `event_key` batch key + `created_by` for sender projection; frontend service/hook/MSW/i18n aligned (`broadcastAdminNotification`, `listAdminBroadcastHistory`); post-implementation hotfixes completed for i18n key scoping, metadata placeholder parse safety, and local DB migration application (`api.0008_notification_event_key`); validation gates passed (`pytest backend/api/tests/test_notification_api.py`, `npm run lint`, `npx tsc --noEmit`, `npm run build`). |

---

## Completed Task Evidence (Reports)

| Task | Report |
|------|--------|
| Code-doc consistency sync (2026-03-12) | `docs/reports/2026-03-12_doc-code-consistency-sync.md` |
| Slice 0 / Task 0.2 (2026-03-17) | `docs/reports/2026-03-17_slice0-task0-2-user-foundation.md` |
| Slice 0 / Task 0.3 (2026-03-23) | `docs/reports/2026-03-23_slice0-task0-3-system-config.md` |
| Slice 1 critical decisions sync (2026-03-23) | `docs/reports/2026-03-23_slice1-critical-decisions-aaac-sync.md` |
| Slice 1 / Task 1.1 (2026-03-26) | `docs/reports/2026-03-26_slice1-task1-1-auth.md` |
| Slice 1 / Task 1.2 (2026-03-27) | `docs/reports/2026-03-27_slice1-task1-2-jwt-refresh.md` |
| Slice 1 / Task 1.3 (2026-03-30) | `docs/reports/2026-03-30_slice1-task1-3-sso-implementation.md` |
| Slice 1 / Task 1.4A (2026-04-13) | `docs/reports/2026-04-13_slice1-task1-4a-password-session.md` |
| Slice 1 / Task 1.5 (2026-04-01) | `docs/reports/2026-04-01_slice1-task1-5-frontend-auth-ui.md` |
| Slice 2 / Task 2.1 (2026-03-30) | `docs/reports/2026-03-30_slice2-task2-1-permission-discovery.md` |
| Slice 3 / Task 3.1 (2026-03-30) | `docs/reports/2026-03-30_slice3-task3-1-system-config-api.md` |
| Slice 2 / Task 2.2 (2026-03-31) | `docs/reports/2026-03-31_slice2-task2-2-rbac-api.md` |
| Slice 2 / Task 2.3 (2026-03-31) | `docs/reports/2026-03-31_slice2-task2-3-handler-grants-bitmap.md` |
| Slice 2 / Task 2.4 (2026-04-01) | `docs/reports/2026-04-01_slice2-task2-4-admin-rbac-ui.md` |
| Slice 3 / Task 3.2 (2026-04-01) | `docs/reports/2026-04-01_slice3-task3-2-system-config-ui.md` |
| Slice 4 / Frontend Foundation (2026-03-31) | `docs/reports/2026-03-31_slice4-full-task-report.md` |
| Slice 0 / Task 0.3.5 (2026-04-01) | `docs/reports/2026-04-01_slice0-task0-3-5-seed-roles.md` |
| Backend Refactor Phase 1-4 (2026-04-01) | `docs/reports/2026-04-01_backend-refactor-phase1-4.md` |
| Permission refactor — unified views (2026-04-14) | `docs/reports/2026-04-14_permission-refactor-unified-views.md` |
| Frontend Surface Split + Admin Auth Entry (2026-04-01) | `docs/reports/2026-04-01_frontend-surface-split-admin-shell.md` |
| Slice 7 / Task 7.1 (2026-04-01) | `docs/reports/2026-04-01_slice7-task7-1-quiz-crud-api.md` |
| Slice 8 / Task 8.2 (2026-04-02) | `docs/reports/2026-04-02_slice8-task8-2-admin-user-management-api.md` |
| Slice 8 / Task 8.3 (2026-04-10) | `docs/reports/2026-04-10_slice8-task8-3-frontend-profile-ui.md` |
| Slice 8 / Task 8.5 (2026-04-13) | `docs/reports/2026-04-13_slice8-task8-5-frontend-session-management.md` |
| Slice 7 / Task 7.5 (2026-04-10) | `docs/reports/2026-04-10_slice7-task7-5-frontend-quiz-browser.md` |
| Slice 8 / Task 8.4 (2026-04-10) | `docs/reports/2026-04-10_slice8-task8-4-frontend-admin-users.md` |
| Slice 7 / Task 7.6 (2026-04-10) | `docs/reports/2026-04-10_slice7-task7-6-frontend-quiz-session.md` |
| Slice 7 / Task 7.7 (2026-04-13) | `docs/reports/2026-04-13_slice7-task7-7-frontend-quiz-editor.md` |
| Bugfix pass H2/M2/M4/M5/L3 (2026-04-14) | `docs/reports/2026-04-14_bugfix-h2-m2-m4-m5-l3.md` |
| Slice 7 integration validation (2026-04-14) | `docs/reports/2026-04-14_slice7-integration-validation.md` |
| Slice 7 checklist follow-up (2026-04-20) | `docs/reports/2026-04-20_slice7-checklist-followup.md` |
| Slice 8 integration validation (2026-04-14) | `docs/reports/2026-04-14_slice8-integration-validation.md` |
| Backend refactor closure (2026-04-14) | `docs/reports/2026-04-14_backend-refactor-closure.md` |
| Slice 5 / Task 5.1 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-1-learn-crud-api.md` |
| Slice 5 / Task 5.2 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-2-course-node-tree-api.md` |
| Slice 5 / Task 5.3 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-3-learn-lesson-crud-api.md` |
| Slice 5 / Task 5.4 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-4-learn-progress-api.md` |
| Slice 5 / Task 5.5 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-5-frontend-course-catalog-tree.md` |
| Slice 5 / Task 5.6 (2026-04-15) | `docs/reports/2026-04-15_slice5-task5-6-frontend-lesson-viewer.md` |
| Slice 5 / Task 5.7 (2026-04-16) | `docs/reports/2026-04-16_slice5-task5-7-frontend-course-editor.md` |
| Slice 9 / Task 9.1 (2026-04-17) | `docs/reports/2026-04-17_slice9-task9-1-notification-api.md` |
| Slice 9 / Task 9.2 (2026-04-17) | `docs/reports/2026-04-17_slice9-task9-2-auto-trigger-signals.md` |
| Slice 9 / Task 9.3 (2026-04-17) | `docs/reports/2026-04-17_slice9-task9-3-websocket-delivery.md` |
| Slice 9 / Task 9.4 (2026-04-20) | `docs/reports/2026-04-20_slice9-task9-4-frontend-notification-bell-inbox.md` |
| Slice 9 / Task 9.5 (2026-04-20) | `docs/reports/2026-04-20_slice9-task9-5-admin-notification-broadcast-history.md` |
| Admin surface token guard bugfix (2026-04-19) | `docs/reports/2026-04-19_admin-surface-token-guard.md` |
| Slice 1-4 browser regression fix pass (2026-04-20) | `docs/reports/2026-04-20_slice1-4-browser-regression-fixes.md` |

---

## In Progress

- None

---

## API Documentation Baseline

- Canonical API reference is now `docs/API.md`.
- Legacy-to-target endpoint migration source is `docs/API_ROUTE_MAPPING.md`.
- Active endpoint inventory in `docs/API.md` only includes APIs aligned with current implementation progress.
- Planned and deferred APIs are tracked in separate sections in `docs/API.md` and are not considered active.
- AI endpoints remain deferred and are excluded from active API scope while `api/ai` routing stays disabled in root URL config.

---

## Not Yet Implemented

Note: several domain endpoints in `backend/api/views/` are currently scaffolded and listed in `docs/API.md` as active/partial runtime routes. The slice tables below still track functional completion by PRD contract (business rules, hardening, and frontend delivery), not just route existence.

### Slice 0 — Foundation (start here)

| Task | Priority | Notes |
|------|----------|-------|
| *(No pending task)* | — | Slice 0 foundation tasks currently complete |

### Slice 1 — Authentication

| Task | Priority | Notes |
|------|----------|-------|
| Password reset email flow (Task 1.4B) | Medium | `POST /api/auth/password/reset/`, `POST /api/auth/password/reset/confirm/` remain deferred by `Q-INFRA-03` |

### Slice 2 — Authorization / RBAC

| Task | Priority | Notes |
|------|----------|-------|
| *(No pending task)* | — | Slice 2 tasks currently complete |

### Slice 3 — System Config

| Task | Priority | Notes |
|------|----------|-------|
| *(No pending task)* | — | Slice 3 tasks currently complete |

### Slice 4 — Frontend Foundation

| Task | Priority | Notes |
|------|----------|-------|
| Shared Tree component | Medium | Pending implementation for Learn/Challenge/Quiz reuse |

### Slice 5 — Learn (Courses)

| Task | Priority | Notes |
|------|----------|-------|
| Course + Category CRUD API | Medium | ✅ Completed 2026-04-15: activated `/api/learn/courses/*`, `/api/learn/categories/*`, `/api/learn/tags/*`; slug-based detail, member visibility hardening, slug conflict 409 suggestions, archive default + admin-only purge, and regression tests in `backend/api/tests/test_learn_course_api.py`. |
| CourseNode tree API | Medium | ✅ Completed 2026-04-15: `/api/learn/courses/{slug}/nodes/`, `/api/learn/courses/{slug}/nodes/{id}/children/`, plus editor/admin `POST/PUT/DELETE` node management; atomic item (Lesson+Node) create, move with descendant `path` updates via `bulk_update`, max depth enforcement via `learn.max_tree_depth`, subtree delete cleans up lessons, and `course.structure_version` bump. Tests: `backend/api/tests/test_learn_course_node_api.py`. |
| Lesson CRUD | Medium | ✅ Completed 2026-04-15: `/api/learn/lessons/{id}/` plus miniquiz mapping endpoints `/api/learn/lessons/{id}/questions/` and `/api/learn/lesson-questions/{id}/`; member published-only visibility and editor/admin writes enforced. |
| User progress tracking signals | Medium | ✅ Completed 2026-04-15: namespaced progress endpoints active (`/api/learn/lessons/{id}/progress/start/`, `/progress/complete/`, `/api/learn/courses/{slug}/progress/`), idempotent start/complete, versioned lazy recompute by `course.structure_version`, and profile first-completion reward updates via signal chain. |
| Frontend: Course catalog + tree | Low | ✅ Completed 2026-04-15: implemented `/{locale}/courses` catalog and `/{locale}/courses/{slug}` detail with sticky filter panel, typed namespaced Learn services, `useCourses` + `courses.store` state orchestration, lazy tree children loading, progress card, i18n parity (`en`/`vi`), and MSW handlers aligned to `/api/learn/*`; validation gates (`lint`, `tsc --noEmit`, `next build`) pass. |
| Frontend: Lesson viewer (md/video/miniquiz) | Low | ✅ Completed 2026-04-15: implemented `/{locale}/courses/{slug}/lessons/{id}` with lesson-type renderer (`markdown`/`video`/`miniquiz`), explicit start/complete progress actions, deterministic prev/next navigation derived from full course tree, and i18n parity + MSW handlers for `/api/learn/lessons/*`; validation gates (`lint`, `tsc --noEmit`, `next build`) pass. |
| Frontend: Course editor (admin/editor surface) | Low | ✅ Completed 2026-04-16: implemented admin Learn routes `/{locale}/admin/learn/courses`, `/new`, `/{slug}`, `/{locale}/admin/learn/lessons/{id}` with course CRUD/status/taxonomy inline management, tree authoring operations, lesson markdown/video/miniquiz editing, quiz-filtered question selection, i18n parity, and MSW write-flow coverage. |
| Outline sync API + tab (deferrable) | Low | Sync blocking MVP; no Celery needed |

### Slice 6 — Challenge (CTF)

> No blockers. Q-CHALL-01 resolved 2026-04-15 → Option C (Wave 1: static/regex functional; instance stubs with MockDeploymentBackend).
> ⚠️ Existing challenge views/services are inaccurate stubs — rewrite from scratch per IMPL_PLAN.

| Task | Priority | Notes |
|------|----------|-------|
| 6.1 Challenge + Category + Tag CRUD API + URL namespace migration | Medium | ✅ Completed 2026-04-30: Canonical viewsets + slug-based lookup + tag upsert + slug conflict 409 + archive/purge destroy |
| 6.2 ChallengeNode tree API (children, move, cycle-safe) | Medium | ✅ Completed 2026-04-30: `/api/challenge/nodes/*` CRUD with lazy children, cycle-safe move, item/parent invariants, and integration tests in `backend/api/tests/test_challenge_node_api.py`. |
| 6.3 ChallengeFlag CRUD | Medium | ✅ Completed 2026-05-02: `ChallengeFlagSerializer`/`ChallengeFlagWriteSerializer`; plaintext storage for all flag types (static + regex); `flag_value` omitted for non-Admin/Editor; 14 integration tests in `backend/api/tests/test_challenge_flag_api.py`. |
| 6.4 Flag submission + progress (Static, Regex, Instance) | Medium | ✅ Completed 2026-05-02: `POST /api/challenge/challenges/{slug}/submit/` (server-side only, returns `{correct: bool}`); `GET /api/challenge/progress/` (`{solved_count, total_attempts}`); idempotent progress update with `challenge_completed` counter + notification on first solve. |
| 6.5 Instance API stubs (MockDeploymentBackend) | Medium | ✅ Completed 2026-05-02: `start`/`stop`/`status` endpoints (user); admin `list` + `kill`; `MockDeploymentBackend` in `instance_service.py`; instance flag generated as plaintext at deploy time. Wave 2: swap to `SocketDeploymentBackend` when external system ready. |
| 6.6 Frontend: Challenge browser + detail + flag submit | Low | ✅ Completed 2026-05-02: `ChallengeCatalogClient` (filter+grid) + `ChallengeDetailClient` (description, flag submit form, instance panel, progress card); service migrated to canonical paths; MSW handlers rewritten to canonical URLs + new instance/progress endpoints; new backend endpoint `GET /api/challenge/challenges/{slug}/progress/`; i18n vi+en. |
| 6.7 Frontend: Challenge editor (admin/editor) | Low | ✅ Completed 2026-05-02: admin challenge list/create/editor (Metadata+Tree+Flags tabs) + flag manager + instance manager; `useAdminChallenges` / `useAdminChallengeTree` / `useAdminChallengeFlags` hooks; MSW `adminChallengesHandlers`; `adminChallenges.*` i18n (vi+en). GitLab tab deferred to 6.8. |
| 6.8 GitLab sync (separate delivery) | Low | Not a blocker for 6.1–6.7; self-contained integration |

### Slice 7 — Quiz

| Task | Priority | Notes |
|------|----------|-------|
| QuizNode tree API | Medium | ✅ Completed 2026-04-01: `/api/quiz/nodes/*` + folder-only MVP + cycle-safe move |
| Django Channels WebSocket consumer | Medium | ✅ Completed 2026-04-01: `/ws/quiz/{id}/` + first-message JWT auth + auth/start/answer/next/finish protocol with polymorphic scoring |
| Quiz progress signals | Medium | ✅ Completed 2026-04-01: Signal handler + 13 pytest tests, UserQuizProgress auto-updates on attempt finish |
| Frontend: Quiz browser | Low | ✅ Completed 2026-04-10: Task 7.5 — `/quizzes` catalog + `/quizzes/[id]` detail with filter panel, progress card, "Start session" link |
| Frontend: WS quiz session | Low | ✅ Completed 2026-04-10: Task 7.6 — `/quizzes/[id]/session` with full WS protocol, 3 question types, answer result, finish screen, MSW mock |
| Frontend: Quiz editor (admin/editor) | Low | ✅ Completed 2026-04-13: Task 7.7 — `/{locale}/admin/quizzes/*` with quiz metadata CRUD, question CRUD, reorder, preview, i18n, and MSW support |

### Slice 8 — User Profile

| Task | Priority | Notes |
|------|----------|-------|
| User profile API (me + public) | Low | ✅ Completed 2026-04-02: `/api/users/me/profile/`, `/api/users/me/settings/`, `/api/users/me/account/`, `/api/users/me/activity/`, `/api/users/{username}/profile/`, `/api/users/{username}/activity/` |
| Admin user management API | Low | ✅ Completed 2026-04-02: `/api/admin/users/`, `/api/admin/users/{id}/` with filters + role update + disable-session revoke behavior |
| Frontend: Profile + settings pages | Low | ✅ Completed 2026-04-10: `/profile/[username]` (public) + `/profile/settings` (own settings); avatar dropdown with "Hồ sơ" / "Cài đặt" pattern |
| Frontend: Admin user management | Low | ✅ Completed 2026-04-10: `/{locale}/admin/users` — paginated user table; search + `is_active` filter; activate/deactivate toggle (deactivate has confirmation dialog); "Manage roles" link to `/admin/rbac/users/{id}/roles`; create-user dialog; MSW handlers added for all 4 admin user endpoints |
| Frontend: Session management page | Low | ✅ Completed 2026-04-13: `/{locale}/profile/sessions` with current-session protection, revoke one, revoke all other sessions, dropdown/settings navigation entry, and MSW support for `/api/auth/sessions/*` |

### Slice 9 — Notifications

| Task | Priority | Notes |
|------|----------|-------|
| Notification API | Low | ✅ Completed 2026-04-17: `/api/notifications/`, `/api/notifications/{id}/mark-read/`, `/api/notifications/mark-all-read/`, `/api/notifications/unread-count/`, `/api/admin/notifications/broadcast/` implemented with focused backend tests and RBAC regression pass. |
| Auto-trigger via Django signals | Low | ✅ Completed 2026-04-17: challenge/quiz/course completion signals create idempotent notifications using stable `event_key`. |
| WebSocket notification delivery | Low | ✅ Completed 2026-04-17: `/ws/notifications/` consumer with first-message JWT auth, per-user group subscription, and realtime push from notification service. |
| Frontend: Notification bell + inbox | Low | ✅ Completed 2026-04-20: user-surface bell + inbox implemented with realtime updates and hyphenated endpoint contract alignment. |
| Frontend: Admin notification broadcast + history | Low | ✅ Completed 2026-04-20: admin page `/{locale}/admin/notifications` now supports broadcast submit + confirmation + grouped history listing with pagination; backend history endpoint `/api/admin/notifications/history/` added and broadcast response extended with `broadcast_batch_key`; FE services/hooks/MSW/messages updated and validation gates passed. |

### Slice 11 — Statistics

| Task | Priority | Notes |
|------|----------|-------|
| Leaderboard API | Low | ✅ Completed 2026-04-17: canonical `/api/stats/leaderboard/` plus compatibility alias `/api/leaderboard/` implemented with dense-rank results, `my_rank`, `total_users`, and regression coverage in `backend/api/tests/test_leaderboard_api.py`. |
| Admin stats API | Low | ✅ Completed 2026-04-17: canonical `/api/admin/stats/` overview plus `/api/admin/stats/users/{id}/` detail endpoint implemented with dedicated service and serializer layer, plus regression coverage in `backend/api/tests/test_admin_stats_api.py`. |
| Frontend: Leaderboard | Low | ✅ Completed 2026-04-30: user-surface leaderboard page is active at `/{locale}/leaderboard` with canonical `/api/stats/leaderboard/` contract, tab switcher, my-rank summary, highlight row, pagination, and MSW alignment. |
| Frontend: Admin detailed statistics | Low | |

---

## Deferred Features

> These features are **not scheduled** for the current implementation phase.
> Do NOT start implementing until explicitly agreed.

| Feature | Slice | Reason |
|---------|-------|--------|
| AI Assistant | Slice 10 | Product decision deferred. Scaffold exists in `backend/ai/` but app is NOT active (`INSTALLED_APPS` commented out). **Do not activate without explicit approval.** |
| Audit Log | — | Low priority; deferred post-MVP |
| Theming | — | Low priority; deferred post-MVP |

---

## Recommended Start Order

> **Principle:** Prioritize functional requirements first; non-functional requirements are implemented only when necessary.
> See [R-DEV-02](DECISIONS.md) — Functional Requirements Priority.

> **AuthZ Bypass:** With `auth.authorization_enabled=false`, feature slices (3–9, 11)
> can be developed **in parallel** with Slice 2 (RBAC).
> See [R-DEV-01](DECISIONS.md) — Authorization Bypass Toggle.

```
Slice 0 (Foundation: User model + migrations + seed_config)
  └── Slice 1 (Authentication)
        ├── Slice 2 (RBAC) ──────── required before production deploy
        ├── Slice 3 (System Config) ← can start with authZ bypass
        ├── Slice 4 (Frontend Foundation) ← can start with authZ bypass
        │     ├── Slice 5 (Learn)
        │     ├── Slice 6 (Challenge)
        │     ├── Slice 7 (Quiz)
        │     └── Slice 8 (User Profile)
        ├── Slice 9  (Notifications — needs 5+6+7 signals)
        └── Slice 11 (Statistics — needs 5+6+7 data)
```

Full task breakdown with per-task file lists: see `docs/IMPL_PLAN.md`.
