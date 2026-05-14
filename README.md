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
python manage.py seed_roles         # bootstrap built-in roles (Admin/Editor/Member)
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
├── backend/                # Django project
│   ├── api/                # All domain ORM models + views/serializers/services
│   ├── auth_app/           # Auth endpoints (login/register/refresh/SSO/sessions)
│   ├── ai/                 # ⚠️ DEFERRED — AI assistant scaffold (NOT in INSTALLED_APPS)
│   ├── realtime/           # Django Channels WebSocket (Quiz consumer)
│   └── backend/            # Django config (settings, urls, asgi)
├── frontend/               # Next.js app (App Router, locale-first)
├── design/
│   └── database/vx/dbv3.sql   # ⚠️ Legacy schema (DATA_MODEL.md is authoritative)
└── docs/
    ├── CLAUDE.md → see root  # AI agent quick-reference (lives at repo root)
    ├── ARCHITECTURE.md       # System design + data flows + what NOT to do
    ├── DATA_MODEL.md         # Authoritative entity/schema reference
    ├── DECISIONS.md          # Open + resolved design decisions (read before any slice)
    ├── REQUIREMENTS.md       # Genesis doc — basic ideas/scope
    ├── CONFIG.md             # Runtime config catalog (system_config keys)
    ├── API.md                # API reference + route migration / legacy mapping (§6)
    ├── FRONTEND.md           # FE setup, conventions, page inventory (consolidated)
    ├── IMPL_PLAN.md          # Vertical slice implementation plan (Slices 0–11)
    ├── STATUS.md             # Per-slice implementation status
    ├── BUGS.md               # Active bugs + recent fix history
    ├── prd/                  # 10 feature PRDs
    ├── normalization/        # Doc normalization workflow + LEDGER (rename/move history)
    ├── reports/              # Per-session implementation reports
    └── intests/              # Browser/integration test checklists
```

---

## Key Documents for Developers

| Document | Read when... |
|----------|-------------|
| `CLAUDE.md` | Starting any dev work — full quick-reference for AI agents and humans |
| `DEV_WORKFLOW.md` | Onboarding as a developer — pick task → plan → code → commit checklist |
| `docs/STATUS.md` | Checking what's done vs pending vs deferred |
| `docs/DECISIONS.md` | Before starting any slice — verify no `OPEN` blocker for the area |
| `docs/ARCHITECTURE.md` | Before implementing new features — design decisions and **what NOT to do** |
| `docs/DATA_MODEL.md` | Before touching DB models or serializers |
| `docs/CONFIG.md` | Before using `system_config` keys |
| `docs/API.md` | Before adding/changing endpoints — maturity tags + route migration table |
| `docs/FRONTEND.md` | Before touching frontend — setup, conventions, page inventory |
| `docs/IMPL_PLAN.md` | Before starting a new slice — dependency order and task breakdown |
| `design/database/vx/dbv3.sql` | ⚠️ **Legacy schema** — historical reference only; `docs/DATA_MODEL.md` is authoritative |

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

See `docs/STATUS.md` for the canonical, per-slice implementation status.

**Current state (May 2026):** Slices 0–9 và 11 đã ship (foundation, auth, RBAC, system config, FE foundation, Learn, Challenge, Quiz, User profile, Notifications, Statistics). Backend + frontend đầy đủ cho cả user surface và admin surface.

**Pending (low priority):**
- Slice 5.8 — Outline sync API + tab
- Slice 6.8 — GitLab challenge sync (separate delivery)

**Deferred:**
- Slice 10 — AI Assistant (scaffold tồn tại trong `backend/ai/` nhưng KHÔNG bật trong `INSTALLED_APPS`; không activate khi chưa có thoả thuận rõ ràng).

**Next:** Bug fixes, performance tuning, hai pending sub-slice ở trên. Theo dõi chi tiết trong `docs/STATUS.md` và `docs/IMPL_PLAN.md`.
