# ILS v2 — Integrated Learning System

Self-hosted cybersecurity learning platform for small organizations (~100 members).

**Three learning pillars:** Learn (courses/lessons) · Challenge (CTF flags) · Quiz (WebSocket Q&A)

**Roles:** Admin · Editor · Member

**External integrations:** Authentik (SSO) · Outline (content editor) · GitLab (challenge sync)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Zustand |
| Backend | Django 6, DRF, SimpleJWT, Django Channels |
| Database | PostgreSQL (SQLite in dev) |
| Auth | JWT with permission claims; SSO via Authentik |

---

## Quick Start

### Prerequisites

- Python 3.13
- Node.js 20+
- (Optional) PostgreSQL for production-like dev

### Backend

```bash
# From repo root
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# or: .venv\Scripts\activate       # Windows

pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py seed_config        # seed default system_config rows
python manage.py runserver          # http://localhost:8000
```

For WebSocket support (Quiz feature):
```bash
daphne -p 8000 backend.asgi:application
```

### Frontend

```bash
cd frontend
# .env.local already present with defaults
npm install
npm run dev                          # http://localhost:4000
```

---

## Project Structure

```
ILS_v2/
├── backend/          # Django project
│   ├── api/          # All domain ORM models
│   ├── ai/           # AI assistant feature
│   ├── realtime/     # Django Channels WebSocket
│   └── backend/      # Django config (settings, urls, asgi)
├── frontend/         # Next.js app (App Router)
├── design/
│   └── database/vx/dbv3.sql   # ⚠️ Legacy schema (DATA_MODEL.md is authoritative)
└── docs/
    ├── ARCHITECTURE.md         # System design + data flows
    ├── DATA_MODEL.md           # Entity reference
    ├── CONFIG.md               # Runtime config catalog
    ├── IMPL_PLAN.md            # Vertical slice implementation plan
    └── prd/                    # 10 feature PRDs
```

---

## Key Documents for Developers

| Document | Read when... |
|----------|-------------|
| `AGENT.md` | Starting any dev work — full quick-reference |
| `docs/ARCHITECTURE.md` | Before implementing new features — understand design decisions and **what NOT to do** |
| `docs/DATA_MODEL.md` | Before touching DB models or serializers |
| `docs/CONFIG.md` | Before using `system_config` keys |
| `docs/IMPL_PLAN.md` | Before starting a new slice — dependency order and task breakdown |
| `docs/FE_SETUP.md` | Frontend environment/setup commands and MSW/i18n behavior |
| `docs/FE_CONVENTIONS.md` | Frontend service/store/type conventions and API contract rules |
| `docs/FE_PAGE_INVENTORY.md` | Route inventory, implemented vs planned pages by slice |
| `design/database/vx/dbv3.sql` | ⚠️ **Legacy schema** — historical reference; `docs/DATA_MODEL.md` is authoritative |

---

## Development Commands

```bash
# See all commands
make help

# Backend
make migrate          # run migrations
make seed             # seed system_config defaults
make test-backend     # pytest
make lint-backend     # ruff check

# Frontend
make dev-frontend     # next dev
make test-frontend    # jest
make lint-frontend    # next lint
```

---

## Running Tests

```bash
# Backend (from repo root)
cd backend && pytest

# With coverage
cd backend && pytest --cov=. --cov-report=term-missing

# Specific app
cd backend && pytest api/tests/ -v
```

---

## Environment Variables

Copy `.env.example` to `.env` in the repo root and fill in the required values.

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key (generate new for each deploy) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `DJANGO_DEBUG` | `True` for dev, `False` for production |

---

## Implementation Status

See `AGENT.md` → Implementation Status section for a full list of done/not-done features.

**Current state:** Slice 0 foundations, Slice 1 auth core (register/login/logout/refresh/SSO), Slice 2 backend RBAC core, Slice 3 backend system-config API, and Slice 4 frontend foundation are completed. Remaining work is mainly feature slices (5+), pending frontend admin pages, and deferred auth/session extras.

**Next:** Continue with Slice 5+ feature delivery and remaining frontend/admin tasks tracked in `docs/STATUS.md` and `docs/IMPL_PLAN.md`.
