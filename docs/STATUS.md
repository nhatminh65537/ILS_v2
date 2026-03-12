# STATUS.md — ILS v2 Implementation Status

> Living document. Update after each completed slice or major task.
> Last updated: 2026-03-12

---

## ⚠️ Pre-Implementation Gate

Before Slice 0 coding can begin, the following **open questions must be resolved by the team**.
Full details in **`docs/DECISIONS.md`**.

| Question | Blocks | Status |
|----------|--------|--------|
| [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — URL prefix convention | All API slices | **OPEN** |
| [Q-AUTH-01](DECISIONS.md#q-auth-01-default-role-for-new-users) — Default role for new users | Slice 1–2 | **OPEN** |
| [Q-AUTH-02](DECISIONS.md#q-auth-02-first-admin-creation-mechanism) — First admin creation | Slice 0 | **OPEN** |
| [Q-INFRA-04](DECISIONS.md#q-infra-04-cache-backend-for-rate-limiting) — Cache backend | Slice 1 | **OPEN** |
| [Q-INFRA-03](DECISIONS.md#q-infra-03-email-backend-for-password-reset) — Email for password reset | Slice 1 | **OPEN** |
| [Q-INFRA-01](DECISIONS.md#q-infra-01-frontend-source-directory) — Frontend src/ layout | Slice 4 | **OPEN** |
| [Q-INFRA-06](DECISIONS.md#q-infra-06-client-side-token-storage) — Token storage | Slice 1, 4 | **OPEN** |
| [Q-INFRA-08](DECISIONS.md#q-infra-08-frontend-ui-component-library) — UI component library | Slice 4 | **OPEN** |
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
| Documentation suite | `ARCHITECTURE.md`, `DATA_MODEL.md`, `CONFIG.md`, `IMPL_PLAN.md`, `BUGS.md`, `STATUS.md`, `DECISIONS.md` |
| Dev infrastructure | `README.md`, `Makefile`, `requirements.txt`, `pytest.ini`, `conftest.py`, `.env.example`, `.gitignore` |
| settings.py | DRF + SimpleJWT + CORS + Channels config added |
| Code-doc consistency sync (2026-03-12) | Existing backend scaffold aligned with current docs for tree path (`path`), flat RBAC direction, deny-only user permission override, permission cache versioning, and system config schema; `manage.py check` passes |

---

## In Progress

*Nothing in progress — resolving open questions before Slice 0.*

---

## Not Yet Implemented

### Slice 0 — Foundation (start here)

| Task | Priority | Notes |
|------|----------|-------|
| Custom `User` model + `AUTH_USER_MODEL` | **Critical** | Must be done before first migration |
| Initial migrations | **Critical** | Run after User model is in place |
| `SystemConfig` model + `seed_config` command | High | Seed all keys from `docs/CONFIG.md` |

### Slice 1 — Authentication

| Task | Priority | Notes |
|------|----------|-------|
| JWT auth: register, login, refresh, logout | High | `auth_app` — new Django app |
| `user_session` tracking | High | Hash refresh tokens before storing |
| SSO / Authentik OIDC | High | Read from `system_config` |
| Password change + reset (email token) | Medium | `itsdangerous` TimestampSigner |
| Session management (list + revoke) | Medium | |
| Frontend: Login / Register pages | Medium | |

### Slice 2 — Authorization / RBAC

| Task | Priority | Notes |
|------|----------|-------|
| Permission auto-discovery at startup | High | Scan URL patterns in `AppConfig.ready()` |
| Role / Permission CRUD API | High | Admin-only |
| `user_permission_cache` + JWT encoding | High | Encode permissions in access token |
| `HasJWTPermission` DRF permission class | High | Check JWT claims, no DB hit |
| Frontend: Admin RBAC UI | Low | |

### Slice 3 — System Config

| Task | Priority | Notes |
|------|----------|-------|
| System Config API (GET / PATCH) | High | Secrets masked in GET; `is_editable=false` → 403 |
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
