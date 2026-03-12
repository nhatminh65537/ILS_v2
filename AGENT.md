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
| `design/database/vx/dbv3.sql` | ⚠️ **Legacy artifact** — pre-normalization schema, kept for reference only; no longer authoritative |
| `backend/api/models.py` | All domain ORM models (~1195 lines); must stay in sync with `docs/DATA_MODEL.md` |

---

## Document Dependency Tree

> **Purpose:** When a document changes, consult this tree to know which other documents must be reviewed and potentially updated. Prevents conflicts and ensures consistency across the doc suite.
>
> **⚠️ Propagation rule:** Any change at a parent tier **MUST** be propagated to all dependents in the same session — or explicitly deferred to a dedicated normalization session and noted in `docs/STATUS.md`.

### Tier Hierarchy

```
Tier 1 — Human-authored Sources (require human decision to change)
├── docs/REQUIREMENTS.md       (genesis doc — original basic ideas; co-authored with PRDs)
│   ┆  NOTE: REQUIREMENTS and prd/*.md are SIBLINGS — update together.
│   ┆  REQUIREMENTS holds the "what/why" (basic idea + scope).
│   ┆  prd/*.md holds the "how/detail" (analysis, acceptance criteria).
├── docs/prd/*.md              (10 PRDs — detailed analysis derived from REQUIREMENTS ideas)
└── docs/DECISIONS.md          (open questions + resolved decisions)

Tier 2 — Core Design (derived from Tier 1)
├── docs/DATA_MODEL.md    ← AUTHORITATIVE for all entity/schema detail (DATA_MODEL.md wins conflicts)
├── docs/ARCHITECTURE.md  ← derived from: REQUIREMENTS.md + prd/*.md + DECISIONS.md
└── docs/CONFIG.md        ← derived from: prd/10-system-config.md + DECISIONS.md

Tier 3 — Implementation Reference (derived from Tier 2)
├── backend/api/models.py          ← derived from: DATA_MODEL.md
└── design/database/vx/dbv3.sql   ⚠️ HISTORICAL ARTIFACT — legacy pre-normalization schema;
                                      no longer authoritative; kept for reference only

Tier 4 — Planning (derived from Tier 2 + resolved DECISIONS.md)
└── docs/IMPL_PLAN.md     ← derived from: ARCHITECTURE.md + DATA_MODEL.md + DECISIONS.md

Tier 5 — Living Trackers (continuously updated)
├── docs/STATUS.md        ← mirrors: IMPL_PLAN.md task state
└── docs/BUGS.md          ← cross-references: backend code + models.py

Tier 6 — Agent Index (aggregates all above)
├── AGENT.md              ← quick reference to everything
└── openmemory.md         ← auto-managed project index (OpenMemory MCP)
```

### Conflict Resolution Rules

| Conflict | Winner | Action |
|----------|--------|--------|
| `DATA_MODEL.md` vs `backend/api/models.py` | **DATA_MODEL.md wins** | Update ORM to match DATA_MODEL.md |
| `docs/prd/*.md` vs `REQUIREMENTS.md` | **Both must agree** | Update the outdated one; they are siblings — keep in sync |
| `DECISIONS.md` (RESOLVED) vs `ARCHITECTURE.md` | **DECISIONS.md wins** | Update `ARCHITECTURE.md` to reflect decision |
| `DECISIONS.md` (RESOLVED) vs `IMPL_PLAN.md` | **DECISIONS.md wins** | Update slice prerequisites in `IMPL_PLAN.md` |
| `ARCHITECTURE.md` vs `IMPL_PLAN.md` | **ARCHITECTURE.md wins** | Update `IMPL_PLAN.md` to match design |
| `DATA_MODEL.md` vs `CONFIG.md` (SystemConfig entity) | **DATA_MODEL.md wins** | Update `CONFIG.md` entity section |
| Any doc vs **OPEN question in DECISIONS.md** | **BLOCKED** | Do NOT implement; resolve the question first |
| `dbv3.sql` vs anything | **dbv3.sql loses** | dbv3.sql is a legacy artifact; ignore its conflicts |

### Update Propagation Guide

**When you update a document, also check/update the downstream documents in the same session (or defer to a normalization session):**

| Document Changed | Must Also Review / Update |
|-----------------|--------------------------|
| `docs/REQUIREMENTS.md` | → `docs/prd/*.md` (check detailed specs still align with updated basic ideas) |
| `docs/prd/*.md` | → `docs/REQUIREMENTS.md` (check basic ideas still consistent), `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` |
| `docs/DATA_MODEL.md` | → `backend/api/models.py` (resync ORM), `docs/CONFIG.md` §SystemConfig if SystemConfig changed |
| `docs/CONFIG.md` | → `docs/DATA_MODEL.md` §SystemConfig (keep entity section consistent) |
| `docs/ARCHITECTURE.md` | → `docs/IMPL_PLAN.md` (resync plan if design changed), `AGENT.md` (update tech stack/conventions if changed) |
| `docs/DECISIONS.md` (new RESOLVED) | → `docs/IMPL_PLAN.md` (remove blocker from slice header), `docs/STATUS.md` (unblock gate), possibly `docs/ARCHITECTURE.md` |
| `docs/IMPL_PLAN.md` | → `docs/STATUS.md` (add/remove tasks to match) |
| `docs/STATUS.md` | → `AGENT.md` if new pre-implementation gates are added |
| `backend/api/models.py` | → Verify against `docs/DATA_MODEL.md` (ORM must stay in sync) |

> **Normalization session:** If propagation cannot be done immediately (too large), create a task in `docs/STATUS.md` titled "Doc normalization: [trigger]" and complete it before the next coding slice.

### Quick Cheatsheet: Who Owns What

| Question | Answer | Document |
|----------|--------|---------|
| What are the business rules / enums / schema? | Data model doc | `docs/DATA_MODEL.md` |
| What are the original high-level requirements? | Genesis doc | `docs/REQUIREMENTS.md` |
| What are the detailed feature specs? | PRD suite | `docs/prd/*.md` |
| How is the system designed? | Architecture doc | `docs/ARCHITECTURE.md` |
| What are the runtime config keys? | Config reference | `docs/CONFIG.md` |
| Has this design question been resolved? | Decision log | `docs/DECISIONS.md` |
| How do the slices break down? | Implementation plan | `docs/IMPL_PLAN.md` |
| What's done / blocked / next? | Status tracker | `docs/STATUS.md` |
| What bugs are known? | Bug tracker | `docs/BUGS.md` |

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
5. **Read `docs/DATA_MODEL.md`** — authoritative entity types, schema, business rules; ORM must match this
6. **Check `backend/api/models.py`** — all domain models exist; work ahead is API layer
7. *(Optional)* `design/database/vx/dbv3.sql` — legacy reference only; do NOT treat as authority
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

## Session Completion — Memory Update (MANDATORY for AI agent)

After the report and `STATUS.md` update, execute **Phase 3** from `CLAUDE.md`:

### Step 1 — Update `openmemory.md`

Edit `openmemory.md` with anything new from this session:

| Created / Changed | Section to update |
|-------------------|-------------------|
| New model / app / service | `## Components` |
| New pattern / architectural flow | `## Patterns` |
| Schema / design decision | `## Key DB Decisions` or `## Architecture` |
| Project status change | `## Status` |

### Step 2 — Store via OpenMemory MCP

Call `add-memory` at least once. Choose the right pattern:

| What to store | user_preference | project_id | memory_types |
|---------------|----------------|------------|--------------|
| New component / service | ❌ | ✅ | `["component"]` |
| Implementation flow | ❌ | ✅ | `["implementation"]` |
| Bug fix | ❌ | ✅ | `["debug"]` |
| Technical decision | ❌ | ✅ | `["project_info"]` |
| Coding preference learned | ✅ | ✅ or ❌ | `["user_preference"]` |

**Minimum threshold:** If 3+ files were changed OR a non-obvious flow was implemented → memory store is **required**.

> See `CLAUDE.md → Phase 3` for full rules and storage intelligence table.

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
