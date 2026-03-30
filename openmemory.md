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
| `backend/api/models.py` | All ORM models (~1195 lines) |
| `backend/ai/` | ⚠️ DEFERRED — AI assistant scaffold (not active, not in INSTALLED_APPS) |
| `backend/backend/settings.py` | Django config (SQLite dev, PostgreSQL commented out) |
| `docs/STATUS.md` | Implementation status per slice |
| `docs/BUGS.md` | Known bugs and fix history |
| `docs/CONFIG.md` | Canonical system_config keys |
| `docs/API.md` | Canonical API reference by implementation progress |
| `AGENT.md` | AI agent quick-reference guide |

## Components

- **api app**: All domain models and current domain viewsets for users, courses, lessons, challenges, quizzes, notifications, leaderboard, and system config.
- **ai app**: ⚠️ DEFERRED — scaffold only (AIAskView, 3 modes, mock LLM); NOT in INSTALLED_APPS; do not activate until approved
- **realtime app**: Django Channels scaffold (empty logic)
- **auth_app**: Implemented for Slice 1 Task 1.1 + 1.2 auth endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/token/refresh`, `/api/auth/logout`, `/api/auth/logout-all`) with session hash tracking, refresh-token rotation, and per-user refresh rate limiting.
- **Abstract ORM**: CreateAudit, UpdateAudit, FullAudit, SoftDeleteAudit, BaseNode, BaseCategory, BaseTag
- **UserSession model**: Added in `api` for refresh-token session tracking (`user_session` table)

## Status

- All domain ORM models complete; API layer is partially implemented and tracked in `docs/API.md`
- Slice 1 Task 1.1 implemented on 2026-03-26: `auth_app` now serves `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/logout-all` with hashed refresh-token session tracking and endpoint tests.
- Slice 1 Task 1.2 implemented on 2026-03-26: `/api/auth/token/refresh` now validates refresh hash against active `user_session`, rotates refresh token/session on success, enforces per-user refresh rate limit (10/min), and keeps JWT access TTL aligned to 15 minutes.
- Slice 1 Task 1.3 implemented on 2026-03-30: SSO/AuthentiK backend endpoints are active (`GET /api/auth/sso/redirect/`, `GET /api/auth/sso/callback/`, `POST /api/auth/identity/link/`) with OIDC state/nonce validation (cache TTL 5 minutes), account-link conflict handling, and test coverage expanded to 22 passing auth tests.
- Slice 2 Task 2.1 implemented on 2026-03-30: startup permission auto-discovery is active via `auth_app.services.permission_discovery`, syncing `Permission.is_active`, built-in role mappings from `@add_role_granted`, and lowercase naming format `{app_label}.{resource_name}.{handler_method_name}`.
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

- **Dot-separated `path`** for all tree structures (e.g., `"1.3"`) — lazy loading via `parent_id` filter is primary; `path` for depth/validation only
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
- **Auth session storage**: Track refresh tokens in `user_session` using hashed values only.
- **Auth refresh rotation**: `POST /api/auth/token/refresh` revokes matched active session, mints new access/refresh pair, and creates a new hashed `user_session` record atomically.
- **Refresh anti-abuse**: Per-user cache key `refresh_rate:{user_id}` blocks refresh requests after 10 hits within 60 seconds.
- **SSO callback anti-replay**: Cache key `sso:state:{state}` stores nonce for 5 minutes and is consumed once during callback validation.
- **Account linking policy**: Resolve by `(provider, external_id)` first; fallback to email-based linking only when `auth.link_accounts_enabled=true`; return conflict when an external identity belongs to a different user.
- **SSO tests**: OIDC discovery/code exchange/id_token decode are mock-driven in unit tests so CI does not require a live Authentik instance.
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
