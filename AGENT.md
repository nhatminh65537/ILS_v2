# AGENT.md — ILS v2 Quick Reference

> Primary reference for any AI agent continuing work on this project.
> Read this file, then consult the linked documents as needed.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | System design, folder structure, data flows, design decisions, what NOT to do |
| `docs/REQUIREMENTS.md` | Requirements for project |
| `docs/DATA_MODEL.md` | Entity types, validation rules, storage schema, business rules |
| `docs/CONFIG.md` | All `system_config` keys with canonical names, types, and descriptions |
| `docs/STATUS.md` | Implementation status per slice (what's done, in progress, not yet started) |
| `docs/BUGS.md` | Known bugs and fix history |
| `docs/IMPL_PLAN.md` | Vertical slice implementation plan (Slices 0–11) |
| `docs/DECISIONS.md` | **Open questions + resolved decisions** — must read before starting any slice |
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

1. **Read `docs/STATUS.md`** — know what's done and what's next before touching anything
2. **Read `docs/DECISIONS.md`** — check open questions for the slice; do NOT code if blockers are OPEN
3. **Check `docs/BUGS.md`** — active bugs to avoid or fix first
4. **Read `docs/ARCHITECTURE.md`** — understand design decisions and what NOT to do
5. **Read `docs/DATA_MODEL.md`** — understand entity types and business rules
6. **Read `design/database/vx/dbv3.sql`** — authoritative schema; the ORM must match it
7. **Check `backend/api/models.py`** — all domain models exist; work ahead is API layer
8. **Check `CLAUDE.md`** — OpenMemory integration rules; search memory before implementing

---

## Implementation Order

See **`docs/IMPL_PLAN.md`** for the full vertical slice plan (Slices 0–11).

> **⚠️ Slice 10 (AI Assistant) is DEFERRED.**
> Do NOT implement any AI feature until explicitly agreed.
> See `docs/STATUS.md → Deferred Features` for details.

---

## How to Run

### Backend

```bash
# From ILS_v2 root
source .venv/bin/activate       # Unix
# or: ./.venv/Scripts/activate  # Windows

cd backend
python manage.py migrate
python manage.py seed_config     # populate system_config defaults
python manage.py runserver       # HTTP at http://localhost:8000
# OR for WebSocket:
daphne -p 8000 backend.asgi:application
```

### Frontend

```bash
cd frontend
npm run dev                      # http://localhost:3000
```

### Make shortcuts

```bash
make migrate          # run migrations
make run              # start Django HTTP server
make run-ws           # start Daphne ASGI server
make test-backend     # run pytest
make dev-frontend     # start Next.js dev server
```

### PostgreSQL (uncomment in `settings.py`)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ils_dev',
        'USER': 'ils_user',
        'PASSWORD': 'changeme',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

---

## Session Completion — Report Requirement

**When the programmer signals that an implementation session is complete**, the agent MUST generate a report in `docs/reports/` before closing out the session.

### Report File Naming

```
docs/reports/YYYY-MM-DD_<short-slug>.md
```

Example: `docs/reports/2026-03-12_slice2-permission-api.md`

### Report Structure

```markdown
# Session Report: <Title>

**Date:** YYYY-MM-DD
**Slices / Areas:** e.g. Slice 2 – Permissions API

## Summary

One-paragraph overview of what was accomplished this session.

## Completed Items

- [ done item 1 ]
- [ done item 2 ]
- ...

## Key Implementations

For each non-trivial piece of logic, document the algorithm/flow concisely.

### <Feature / Component Name>

1. Step one — what happens and why
2. Step two — key decision or transformation
3. Step three — edge cases or final result

(Repeat for every important implementation in the session.)

## Files Changed

| File | Change Summary |
|------|---------------|
| `path/to/file.py` | Added X, modified Y |

## Notes / Caveats

Any warnings, deferred work, known limitations, or follow-up tasks.
```

### Rules

- **Always create the report** when the programmer says the session is done — do NOT skip it.
- Keep algorithm descriptions short but precise (3–6 numbered steps each).
- Only document **non-trivial** logic; skip boilerplate CRUD.
- Reference the slice number from `docs/IMPL_PLAN.md` when applicable.
- After writing the report, update `docs/STATUS.md` to reflect newly completed items.

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
- Services in `<app>/services/` directory
- API views: DRF `APIView` or `GenericAPIView`; serializers for all I/O

**Critical DB rules:**
- `pre_path` (materialized path): maintain on create/move; update self + all descendants on move
- `user_session.refresh_token_hash`: always hash tokens before storing
- `challenge_instance`: partial unique index on (user, challenge) WHERE status='running'
- Join tables (tag maps, role_permission): `CreateAudit` only — no updated fields

**Security:**
- Never store plaintext tokens
- Challenge flags checked server-side only; never return flag values to client
- `SECRET_KEY` in `settings.py` is dev default — replace before any real deployment
- Rate-limit auth endpoints
