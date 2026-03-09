# AGENT.md — ILS v2 Quick Reference

> Primary reference for any AI agent continuing work on this project.
> Read this file, then consult the linked documents as needed.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | System design, folder structure, data flows, design decisions, what NOT to do |
| `docs/DATA_MODEL.md` | Entity types, validation rules, storage schema, business rules |
| `docs/prd/` | Product Requirements Documents (10 features) |
| `design/database/vx/dbv3.sql` | **Authoritative schema** — when ORM and SQL conflict, SQL wins |
| `backend/api/models.py` | All domain ORM models (~1195 lines) |

---

## Project Overview

ILS v2 is a **self-hosted cybersecurity learning platform** for small organizations (~100 members). One instance per organization. Not designed for horizontal scaling.

**Three learning pillars:** Learn (courses/lessons) · Challenge (CTF flags) · Quiz (WebSocket self-practice)

**User roles:** Admin (full system access) · Editor (content management) · Member (content consumption)

**External integrations:** Authentik (SSO) · Outline (lesson content) · GitLab (challenge source)

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + Zustand |
| Backend | Django 6 + DRF + SimpleJWT + Django Channels |
| Database | PostgreSQL (dev: SQLite) |
| Auth | JWT with encoded permission claims; SSO via Authentik |

---

## Before Coding — Checklist

1. **Read `docs/ARCHITECTURE.md`** — understand design decisions and what NOT to do
2. **Read `docs/DATA_MODEL.md`** — understand entity types and business rules
3. **Read `design/database/vx/dbv3.sql`** — authoritative schema; the ORM must match it
4. **Check `backend/api/models.py`** — all domain models exist; work ahead is API layer
5. **Check `CLAUDE.md`** — OpenMemory integration rules; search memory before implementing

---

## Implementation Order (Recommended)

1. Fix known bugs (see Known Bugs below)
2. Create custom `User` model in `api` app → set `AUTH_USER_MODEL = 'api.User'` → run initial migrations
3. JWT auth: register, login, refresh, logout with `user_session` tracking
4. Permission system: endpoint auto-discovery at startup, RBAC API, JWT encoding, `user_permission_cache`
5. CRUD APIs for courses, challenges, quizzes (patterns from existing models)
6. Outline + GitLab integrations (base URLs from `system_config`)
7. Quiz WebSocket (Django Channels)
8. Frontend pages

---

## Known Bugs

| Bug | Location |
|-----|----------|
| Typo in serializer | `ai/serializers.py:6` — `"lern_assistant"` → `"learn_assistant"` |
| Wrong field reference | `ai/models.py:18` — `self.mode` doesn't exist; field is `context_type` |
| `ai` missing from INSTALLED_APPS | `backend/backend/settings.py` |
| AI URLs not registered | `backend/backend/urls.py` — `ai.url` not included |
| LLM client is mock | `ai/services/llm_client.py` — returns hardcoded string |

---

## Implementation Status

### Done
| Area | Notes |
|------|-------|
| Django project scaffold | Apps: `api`, `ai`, `realtime` |
| All domain ORM models | Challenge, Course, Quiz + tree nodes, flags, progress, instances |
| Abstract base models | CreateAudit, UpdateAudit, FullAudit, SoftDeleteAudit, BaseNode, BaseCategory, BaseTag |
| Database schema review | All CRITICAL/HIGH/MEDIUM/LOW issues fixed in `dbv3.sql` and `models.py` (2026-03-09) |
| AI services scaffold | 3 modes: learn_assistant, editor_assistant, learning_path |
| Next.js scaffold | Default create-next-app, all deps installed |
| PRD documents | 10 feature PRDs in `docs/prd/` |

### Not Yet Implemented
| Area | Priority |
|------|----------|
| Custom User model + AUTH_USER_MODEL | High |
| JWT authentication (login/register/refresh/logout) | High |
| SSO / Authentik integration | High |
| Permission/RBAC system + auto-discovery | High |
| `user_permission_cache` logic | High |
| All API views/serializers | High |
| System config table + admin UI | High |
| Course / Challenge / Quiz APIs | Medium |
| Outline + GitLab integrations | Medium |
| Quiz WebSocket | Medium |
| Notification system | Low |
| User profile / settings pages | Low |
| Leaderboard / statistics | Low |
| Frontend pages | Low |
| Audit log | Low |
| i18n (next-intl) | Low |
| Theming | Low |

---

## How to Run

### Backend

```bash
# From ILS_v2 root
./.venv/Scripts/activate        # Windows
# or: source .venv/bin/activate # Unix

cd backend
python manage.py migrate
python manage.py runserver       # HTTP at http://localhost:8000
# OR for WebSocket:
daphne -p 8000 backend.asgi:application
```

### Frontend

```bash
cd frontend
npm run dev                      # http://localhost:3000
```

### PostgreSQL (uncomment in `settings.py`)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ils_test_db',
        'USER': 'ils_test_user',
        'PASSWORD': 'ils_test_strong_password',
        'HOST': 'rougitsune.top',
        'PORT': '5432',
    }
}
```

---

## Code Conventions (Key Points)

> Full architecture rules and what-NOT-to-do: see `docs/ARCHITECTURE.md` §7–8

**Django models:**
- Inherit from `FullAudit` (all domain entities) or `CreateAudit` (join tables only)
- Always set `db_table` on concrete models; `db_column` on FK fields
- Use `TextChoices` for all enums; explicit join tables for M2M (no `ManyToManyField`)
- Use `related_name` on all FK/O2O fields

**App structure:**
- App-level URLs in `<app>/urls.py`, included into `backend/backend/urls.py`
- Services in `<app>/services/` (see `ai/services/` as pattern)
- API views: DRF `APIView` or `GenericAPIView`; serializers for all I/O

**Critical DB rules:**
- `pre_path` (materialized path): maintain on create/move; update self + all descendants on move
- `user_session.refresh_token_hash`: always hash tokens before storing
- `challenge_instance`: partial unique index on (user, challenge) WHERE status='running'
- Join tables (tag maps, role_permission): `CreateAudit` only — no updated fields

**Security:**
- Never store plaintext tokens
- Challenge flags checked server-side only; never return flag values to client
- AI `learn_assistant` mode must not return flag/challenge solutions
- `SECRET_KEY` in `settings.py` is dev default — replace before any real deployment
- Rate-limit auth endpoints
