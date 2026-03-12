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
- **Authorization**: API-based fine-grained RBAC; permissions stored in DB, encoded in JWT

## Key Files

| File | Purpose |
|------|---------|
| `design/database/vx/dbv3.sql` | **Authoritative schema** |
| `backend/api/models.py` | All ORM models (~1195 lines) |
| `backend/ai/` | ⚠️ DEFERRED — AI assistant scaffold (not active, not in INSTALLED_APPS) |
| `backend/backend/settings.py` | Django config (SQLite dev, PostgreSQL commented out) |
| `docs/STATUS.md` | Implementation status per slice |
| `docs/BUGS.md` | Known bugs and fix history |
| `docs/CONFIG.md` | Canonical system_config keys |
| `AGENT.md` | AI agent quick-reference guide |

## Components

- **api app**: All domain models — Challenge, Course, Quiz + nodes, flags, progress (~1195 lines)
- **ai app**: ⚠️ DEFERRED — scaffold only (AIAskView, 3 modes, mock LLM); NOT in INSTALLED_APPS; do not activate until approved
- **realtime app**: Django Channels scaffold (empty logic)
- **auth_app**: To be created in Slice 1 — JWT auth, SSO, session management
- **Abstract ORM**: CreateAudit, UpdateAudit, FullAudit, SoftDeleteAudit, BaseNode, BaseCategory, BaseTag

## Status

- All domain ORM models complete; no API views exist yet
- **Pre-implementation gate active**: 12+ open questions in `docs/DECISIONS.md` must be resolved by humans before coding starts
- Next action: resolve open questions → start Slice 0

## Patterns

- Materialized Path (`pre_path`) for all tree structures — avoids N+1 queries
- Explicit join tables for M2M (not Django ManyToManyField)
- All models inherit FullAudit; explicit `db_table` and `db_column` on every model
- **Join tables** (tag maps, role_permission): use **CreateAudit only** — no updated_at/updated_by
- `TextChoices` for all enums (Status: draft/published/archived)
- Services in `<app>/services/` directory pattern
- Permission cache in `user_permission_cache` table; versioned with `user.permission_version`

## Key DB Decisions (2026-03-09 schema review)

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

## Requirements

Full requirements documented in `REQUIREMENTS.md` (converted from `requirements.docx`).
Key requirements by domain:
- **Auth:** SSO (Authentik) + native login; admin configures enabled methods
- **AuthZ:** API-based fine-grained RBAC; JWT claims; endpoint scan at startup; permission cache in DB
- **Learn:** Course-folder-lesson tree; Outline integration; materialized path; progress tracking
- **Challenge:** GitLab import; flag check on server; deployable instances (external system)
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
