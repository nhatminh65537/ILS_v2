# STATUS.md — ILS v2 Implementation Status

> Living document. Update after each completed slice or major task.
> Last updated: 2026-03-30

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
| [Q-AUTH-07](DECISIONS.md#q-auth-07-device-logout-granularity) — Device logout granularity | Slice 1 (Task 1.4 deferred) | **OPEN** |
| [Q-INFRA-09](DECISIONS.md#q-infra-09-cors-and-domain-configuration) — CORS + domain configuration | Slice 1 (Task 1.5) | **OPEN** |
| [Q-ARCH-01](DECISIONS.md#q-arch-01-max-permissions-bitmap-capacity) — Max permissions bitmap size | Slice 2+ | **OPEN** |
| [Q-CONFIG-01](DECISIONS.md#q-config-01-default-systemconfig-auth-values) — Default system config seed values | Slice 0 (Task 0.3), Slice 1 | **OPEN** |
| [Q-INFRA-08](DECISIONS.md#q-infra-08-frontend-ui-component-library) — UI component library | Slice 4+ | **OPEN** |
| [Q-LEARN-01](DECISIONS.md#q-learn-01-lesson-node-creation-atomicity) — Lesson node atomicity | Slice 5 | **OPEN** |
| [Q-LEARN-02](DECISIONS.md#q-learn-02-mini-quiz-question-source) — Mini-quiz question source | Slice 5 | **OPEN** |
| [Q-CHALL-01](DECISIONS.md#q-chall-01-challenge-instance-scope) — Challenge instances in MVP | Slice 6 | **OPEN** |
| [Q-INFRA-05](DECISIONS.md#q-infra-05-websocket-jwt-auth-method) — WebSocket JWT auth | Slice 7 | **OPEN** |

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
| Slice 1 / Task 1.1 (2026-03-26) | New `auth_app` implemented and wired at `/api/auth/*` with native `register`, `login`, `logout`, `logout-all`; session hash storage in `user_session`; login rate-limit; endpoint tests added and passing (`6 passed`) |
| Slice 1 / Task 1.2 (2026-03-27) | `POST /api/auth/token/refresh/` implemented with session-hash validation, token/session rotation, per-user refresh rate limit (`10/min`), updated JWT access lifetime (`15m`), CORS dev frontend port (`4000`), and expanded auth tests (`15 passed`) |
| Slice 1 / Task 1.3 (2026-03-30) | SSO/AuthentiK backend endpoints implemented: `GET /api/auth/sso/redirect/`, `GET /api/auth/sso/callback/`, `POST /api/auth/identity/link/`; callback validates state/nonce with cache TTL, auto-links by `provider+external_id` and email fallback when linking is enabled, creates JWT session via existing TokenService flow, and adds auth test coverage (`22 passed`) |
| Slice 2 / Task 2.1 (2026-03-30) | Permission auto-discovery implemented at startup via `auth_app.services.permission_discovery.discover_permissions()` with idempotent sync (`is_active` reset/reactivate), built-in role mapping from `@add_role_granted`, and normalized permission naming (`{app_label}.{resource_name}.{handler_method_name}` lowercase); tests added and passing in `auth_app/tests.py` |
| Slice 3 / Task 3.1 (2026-03-30) | System Config admin API implemented at `/api/admin/config/*` with grouped list response, key-based detail/update (`lookup_field=key`), PATCH type validation by `value_type`, secret masking (`***`), `is_editable=false` guard (`403`), cache invalidation after update, and pytest coverage (`9 passed`) |

---

## In Progress

- None

---

## API Documentation Baseline

- Canonical API reference is now `docs/API.md`.
- Active endpoint inventory in `docs/API.md` only includes APIs aligned with current implementation progress.
- Planned and deferred APIs are tracked in separate sections in `docs/API.md` and are not considered active.
- AI endpoints remain deferred and are excluded from active API scope while `api/ai` routing stays disabled in root URL config.

---

## Not Yet Implemented

### Slice 0 — Foundation (start here)

| Task | Priority | Notes |
|------|----------|-------|
| *(No pending task)* | — | Slice 0 foundation tasks currently complete |

### Slice 1 — Authentication

| Task | Priority | Notes |
|------|----------|-------|
| Session listing/revoke APIs | Medium | `GET /api/auth/sessions/`, revoke-by-id not implemented yet |
| Password change + reset (email token) | Medium | `itsdangerous` TimestampSigner |
| Frontend: Login / Register pages | Medium | |

### Slice 2 — Authorization / RBAC

| Task | Priority | Notes |
|------|----------|-------|
| Role / Permission CRUD API | High | Admin-only |
| `user_permission_cache` + JWT encoding | High | Encode permissions in access token |
| `HasJWTPermission` DRF permission class | High | Check JWT claims, no DB hit |
| Frontend: Admin RBAC UI | Low | |

### Slice 3 — System Config

| Task | Priority | Notes |
|------|----------|-------|
| Frontend: Admin Config UI | Low | |

### Slice 4 — Frontend Foundation

| Task | Priority | Notes |
|------|----------|-------|
| App directory structure | Medium | Route groups: `(auth)/`, `(app)/`, `admin/` |
| Shared Axios instance + interceptors | Medium | Auto-refresh on 401 |
| Zustand auth store | Medium | |
| Shared Tree component | Medium | Lazy-load, reused in Learn/Challenge/Quiz |
| i18n setup (next-intl, en + vi) | Low | |

### Slice 5 — Learn (Courses)

| Task | Priority | Notes |
|------|----------|-------|
| Course + Category CRUD API | Medium | |
| CourseNode tree API | Medium | dot-separated `path` + `bulk_update` on move |
| Lesson CRUD + Outline sync | Medium | |
| User progress tracking signals | Medium | |
| Frontend: Course catalog + tree | Low | |
| Frontend: Lesson viewer (md/video/miniquiz) | Low | |

### Slice 6 — Challenge (CTF)

| Task | Priority | Notes |
|------|----------|-------|
| Challenge + Category CRUD API | Medium | |
| ChallengeNode tree + ChallengeFlag CRUD | Medium | Flag values never returned to members |
| Flag submission (server-side only) | Medium | Static, regex, instance-specific |
| GitLab sync | Medium | Read base URL from `system_config` |
| Frontend: Challenge browser + submit | Low | |

### Slice 7 — Quiz

| Task | Priority | Notes |
|------|----------|-------|
| Quiz + Question CRUD API | Medium | |
| QuizNode tree API | Medium | No circular FK |
| Django Channels WebSocket consumer | Medium | JWT in query string |
| Quiz progress signals | Medium | `best_score`, `attempt_count` |
| Frontend: Quiz browser + WS session | Low | |

### Slice 8 — User Profile

| Task | Priority | Notes |
|------|----------|-------|
| User profile API (me + public) | Low | |
| Admin user management API | Low | |
| Frontend: Profile + settings pages | Low | |
| Frontend: Admin user management | Low | |

### Slice 9 — Notifications

| Task | Priority | Notes |
|------|----------|-------|
| Notification API | Low | |
| Auto-trigger via Django signals | Low | On challenge/quiz/course complete |
| WebSocket notification delivery | Low | Per-user channel group |
| Frontend: Notification bell + inbox | Low | |

### Slice 11 — Statistics

| Task | Priority | Notes |
|------|----------|-------|
| Leaderboard API | Low | |
| Admin stats API | Low | |
| Frontend: Leaderboard + admin stats | Low | |

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
