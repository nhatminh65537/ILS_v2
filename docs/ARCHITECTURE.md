# ARCHITECTURE.md — ILS v2 System Architecture

> This document covers system design, folder structure, data flows, and architectural decisions.
> For data model details, see `docs/DATA_MODEL.md`.
> For quick-start and implementation guide, see `AGENT.md`.

---

## 1. System Overview

ILS v2 is a **self-hosted cybersecurity learning platform** for small organizations (~100 members). One deployment = one organization. Not designed for multi-tenancy or horizontal scaling.

**Three learning pillars:**
1. **Learn** — Structured courses with markdown/video/miniquiz lessons, progress tracking
2. **Challenge** — CTF-style flag challenges with optional instance deployment, GitLab sync
3. **Quiz** — Real-time self-practice Q&A sessions over WebSocket

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js App Router | 16.1.1 |
| Frontend UI library | React | 19.2.3 |
| Frontend styling | Tailwind CSS | v4 |
| Frontend state | Zustand | ^5.0.9 |
| Frontend i18n | next-intl | ^4.7.0 |
| Frontend HTTP | Axios | ^1.13.2 |
| Backend framework | Django | 6.0 |
| Backend API | Django REST Framework | latest |
| Backend auth tokens | djangorestframework-simplejwt | latest |
| Backend realtime | Django Channels + Daphne | latest |
| Database | PostgreSQL (dev: SQLite) | latest |
| Python | 3.13 | in `.venv` |
| SSO provider | Authentik (goauthentik) | external |
| Content storage | Outline (self-hosted wiki) | external |
| Challenge source | GitLab (self-hosted) | external |

---

## 3. Folder Structure

```
ILS_v2/
├── CLAUDE.md               # AI agent rules (OpenMemory integration) — DO NOT MODIFY
├── AGENT.md                # AI agent quick-reference guide
├── README.md               # Project overview + quick start
├── Makefile                # Common dev commands
├── requirements.txt        # Python dependencies
├── setup.txt               # Setup commands reference
├── openmemory.md           # OpenMemory project index (auto-managed)
│
├── docs/                   # Project documentation
│   ├── DATA_MODEL.md       # Entity types, validation rules, business rules
│   ├── ARCHITECTURE.md     # This file — system design and data flows
│   ├── CONFIG.md           # system_config canonical keys reference
│   ├── STATUS.md           # Implementation status per slice
│   ├── BUGS.md             # Known bugs and fix history
│   ├── IMPL_PLAN.md        # Vertical slice implementation plan (Slices 0–11)
│   ├── API.md              # Canonical API reference by implementation progress
│   ├── REQUIREMENTS.md     # Full project requirements
│   └── prd/                # Product Requirements Documents
│       ├── README.md       # PRD index
│       ├── 01-authentication.md
│       ├── 02-authorization.md
│       ├── 03-learn.md
│       ├── 04-challenge.md
│       ├── 05-quiz.md
│       ├── 06-user-profile.md
│       ├── 07-notification.md
│       ├── 08-statistics.md
│       ├── 09-ai-assistant.md
│       └── 10-system-config.md
│
├── design/
│   ├── api/                # API design docs (to be filled)
│   ├── database/
│   │   ├── v1/             # Per-table SQL files (historical)
│   │   └── vx/
│   │       ├── dbv2.sql    # Intermediate schema (historical)
│   │       └── dbv3.sql    # ⚠️ LEGACY ARTIFACT — pre-normalization; `DATA_MODEL.md` is authoritative
│   └── ui/                 # UI designs (to be filled)
│
├── backend/
│   ├── manage.py
│   ├── backend/            # Django project config
│   │   ├── settings.py     # SQLite dev; PostgreSQL config commented out
│   │   ├── urls.py         # Root URLconf (`/admin/`, `/api/`; AI route deferred)
│   │   └── asgi.py         # ASGI entry for Daphne/Channels
│   ├── api/                # Main app — all domain models
│   │   └── models.py       # ~1195 lines — complete ORM for all domains
│   ├── ai/                 # ⚠️  DEFERRED — AI Assistant (do NOT activate until approved)
│   │   ├── models.py       # AIRequest model (scaffold only)
│   │   ├── views.py        # AIAskView (scaffold only)
│   │   ├── serializers.py  # AIRequestSerializer (scaffold only)
│   │   ├── constants.py    # AImode enum
│   │   ├── permissions.py  # HasAIPermission (uses JWT claims)
│   │   ├── urls.py         # URL conf (NOT wired into root urls.py)
│   │   └── services/
│   │       ├── context_loader.py   # Loads Lesson/Challenge context from DB
│   │       ├── prompt_builder.py   # Builds prompts for 3 AI modes
│   │       └── llm_client.py       # MOCK — returns hardcoded string
│   └── realtime/           # WebSocket app (scaffold only — no logic yet)
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx      # Default Next.js layout (not customized yet)
    │   └── page.tsx        # Default Next.js home page (not customized yet)
    └── public/             # Default Next.js assets
```

**Future backend structure (as features are added):**
```
backend/
├── api/
│   ├── models.py           # Existing — all domain models
│   ├── views/              # Split by domain when views are added
│   │   ├── challenge.py
│   │   ├── course.py
│   │   ├── quiz.py
│   │   └── ...
│   ├── serializers/        # Split by domain
│   ├── permissions.py      # Custom DRF permission classes
│   └── urls.py             # App-level URL routing
├── auth/                   # JWT auth, SSO, session management
│   └── services/
├── realtime/               # Quiz WebSocket consumers
└── ...
```

---

## 4. Key Design Decisions

### 4.1 API-Based Authorization (not resource-based)

Chosen because:
- Small org (~100 users), content creators are few
- All published content is accessible to all members — no per-object ownership model
- Role-based: Admin, Editor, Member; not per-resource ACL

**Implementation:** Every API endpoint requires a specific permission. Permissions are **flat** (no hierarchy). Roles are bundles of permissions. Built-in roles (Admin, Editor, Member) are auto-created via `@add_role_granted` decorator scan at startup.

**Decision record:** See `requirements.docx` Q1-Q9 in section 2.2.

---

### 4.2 JWT Permission Claims

Permissions are encoded into the **access token** at login time. Every API request validates permissions from the token — no DB hit per request.

**Why:** Fast permission checks at scale; acceptable trade-off for small org use case.

**Cache strategy:** `user_permission_cache` table stores the pre-encoded permission bitmap (base64) per user. On JWT issue, use cache if `user.permission_version` matches; otherwise recompute.

**Bitmap encoding:** Permissions are encoded as a binary bitmap (≤256 permissions = 32 bytes → base64 ≈ 44 chars). Each permission `id` maps to a bit position. JWT claims: `{"permissions": "<base64>", "pv": <version>}`.

**Token invalidation:** When admin changes a user's permissions, `user.permission_version` is incremented (per-user, not global). The user gets updated permissions on their next token refresh.

---

### 4.3 Flat Permissions — No Hierarchy

Permissions are **flat** — no `parent_id` or tree structure. Roles provide sufficient grouping.

**Why no hierarchy:**
- With `@add_role_granted` and built-in roles, grouping is already handled at the role level.
- Hierarchy only served "disable parent → disable all children" which is no longer needed (admin cannot toggle `is_active` via API — it's fully controlled by startup scan).
- Eliminates tree-walk overhead during permission encoding and circular reference validation.

---

### 4.4 Permission Auto-Discovery & Built-in Roles at Startup

Permissions are created automatically by scanning all registered API endpoints at Django startup (metaprogramming). This means:
- Permissions are never manually created by admins
- Permissions cannot be deleted (they become inactive if endpoint is removed)
- Permissions are **read-only via API** — only `GET` is allowed (no `PATCH`/`PUT`/`POST`/`DELETE`)
- On startup: all existing permissions set to `is_active=FALSE`, then re-scan marks found ones active again
- Permission `name` is auto-generated from view class and HTTP method: `{app_label}.{ViewClassName}.{http_method}`. Optional override via `permission_code` attribute on view.

**Built-in roles** via `@add_role_granted('Admin', 'Editor', 'Member')` decorator:
- Decorator on each view/method declares which built-in roles should have this permission
- Startup scan collects all decorators → auto-creates roles (with `is_system=TRUE`) if not exist
- Built-in role → permission mappings are synced on every startup (idempotent)
- Built-in roles cannot be deleted or have permissions modified via API
- Custom roles (admin-created, `is_system=FALSE`) are fully manageable via API

**Startup sequence:**
1. Scan all endpoints → upsert permissions (set `is_active`)
2. Scan `@add_role_granted` decorators → upsert built-in roles → sync `role_permission`

---

### 4.5 Dot-Separated Path for Tree Structures

All tree structures (CourseNode, ChallengeNode, QuizNode) use a `path` field storing the dot-separated ancestor IDs:

```
Example: "1.3" on node id=10
→ node id=10, whose parent is id=3, whose grandparent is id=1
Root nodes: path = "" (empty string)
```

**Primary access pattern: Lazy loading** — load direct children via `filter(parent_id=X)`. No subtree prefix query needed for normal operations.

**When path is used:**
- **Depth validation:** `depth = 0 if path == '' else path.count('.') + 1`
- **Move validation:** Prevent moving a node under itself: check `target.path` does not start with `source.path + '.' + str(source.id)`
- **Subtree queries** (rare): `filter(path__startswith=node.path + '.' + str(node.id))`

**Maintenance:** Update `path` on create and on move (self + all descendants). Format: `parent.path + '.' + str(parent.id)` (if parent exists, else `""`).

---

### 4.6 Node/Item Pattern for All Content Trees

Every domain (course, challenge, quiz) uses a unified Node model for its tree:
- `is_item=False` → folder node (no content FK)
- `is_item=True` → leaf node (has FK to content entity: lesson, challenge, or quiz)

**All tree operations go through Node** — never bypass nodes to directly access content. This ensures consistent ordering (`position` field), path queries, and tree manipulation.

---

### 4.7 External Integrations via system_config

External service hostnames (Outline URL, GitLab URL, instance deploy server) are stored in `system_config`, not hardcoded. Per-record URLs use relative paths or IDs, not absolute URLs.

**Why:** Allows admins to change external service URLs without updating every content record. Migration-proof.

---

### 4.8 Quiz: No Circular FK

`quiz` does NOT have a FK to `quiz_node`. Only `quiz_node.quiz_id → quiz` (one-way). Access the node from a quiz via Django's reverse relation accessor.

**Why:** Avoids circular FK which complicates migrations and schema management.

---

### 4.9 Join Table Audit Fields

Many-to-many join tables (tag maps, role_permission) use **CreateAudit only** (no `updated_at`/`updated_by`). Join tables are insert/delete only — records are never updated in-place.

---

### 4.10 Instance Deployment Interface (Strategy Pattern)

The instance deployment system (spinning up challenge containers) is an **external system** — not part of this project's scope. ILS defines a **clean interface** to communicate with it.

**Design:** Strategy pattern with swappable backends:
```python
class InstanceDeploymentBackend(Protocol):
    async def deploy(self, challenge_id: int, user_id: int) -> InstanceResult: ...
    async def status(self, instance_id: str) -> InstanceStatus: ...
    async def stop(self, instance_id: str) -> bool: ...
    async def logs(self, instance_id: str) -> list[LogEntry]: ...
```

**Current implementation:** `SocketDeploymentBackend` (raw TCP socket — required by course curriculum). The interface is designed so that after the course, the socket backend can be replaced with `HttpDeploymentBackend`, `GrpcDeploymentBackend`, etc. without touching any calling code.

**Backend selection:** Configured via Django settings (not `system_config`), since switching transport protocol is a code-level decision, not a runtime admin decision. Connection parameters (URL, token) are in `system_config`.

**Key constraint:** The interface must be **conceptually synchronous** (request → response) regardless of transport. Use `async/await` to abstract the transport layer.

---

### 4.11 Authorization Bypass for Development

`system_config[auth.authorization_enabled]` (bool, default `true`) controls whether RBAC permission checks are enforced on API endpoints.

When set to `false`:
- All **authenticated** users bypass permission checks — every endpoint is accessible regardless of role.
- Authentication (login/JWT) is still required — unauthenticated requests are still rejected with 401.
- Permission auto-discovery and role sync still run at startup (DB data stays consistent).
- JWT still includes the `permissions` bitmap — it is simply not checked.

**Purpose:** Allow developers to work on feature slices (Learn, Challenge, Quiz, etc.) without needing a fully functional RBAC system. This decouples feature development from Slice 2 (Authorization).

**Implementation:** The `HasJWTPermission` DRF permission class (or equivalent middleware) checks `get_config('auth.authorization_enabled', True)` before evaluating the bitmap. If `False`, the check returns `True` immediately.

```python
class HasJWTPermission(BasePermission):
    def has_permission(self, request, view):
        # Bypass if authZ is disabled (dev mode)
        if not get_config('auth.authorization_enabled', True):
            return True
        # Normal bitmap check
        ...
```

**⚠️ Production rule:** `auth.authorization_enabled` MUST be `true` in production. The `seed_config` command sets it to `true` by default. Setting it to `false` in production is a critical security misconfiguration.

---

### 4.13 No Database Triggers

All denormalized field updates (counters, aggregates, path maintenance) are done at **application level** via Django signals or explicit service method calls. **No PostgreSQL triggers** are used.

**Why:** Logic is visible in Python code, easy to test, easy to debug. Triggers hide logic in DB layer, making it harder to trace, test, and maintain.

---

## 5. Data Flows

### 5.1 Authentication Flow (Native Login)

```
Client → POST /auth/login (username, password)
  → Validate credentials against user.password
  → Look up user_permission_cache
      → Cache valid (version matches): use encoded_permissions
      → Cache invalid: compute permissions from DB, update cache
  → Generate access_token (short-lived, includes encoded_permissions)
  → Generate refresh_token (long-lived, hashed and stored in user_session)
  → Return { access_token, refresh_token }
```

### 5.2 Authentication Flow (SSO via Authentik)

```
Client → GET /auth/sso/authentik/login
  → Redirect to Authentik OAuth2 authorization URL
Authentik → Callback: GET /auth/sso/authentik/callback?code=...
  → Exchange code for user info (provider, external_id, email, etc.)
  → Look up user_identity(provider, external_id)
      → Found: map to existing user
      → Not found: create user + user_profile + user_identity
  → Continue with same JWT issuance as native login
```

### 5.3 Permission Check Flow (per API request)

```
Request → Extract Bearer token
  → Decode JWT, read `permissions` claim (base64 bitmap) and `pv` claim (version)
  → Decode base64 → bitmap
  → Look up permission.id for the required permission name
  → Check bit at position permission.id in bitmap
      → Bit set (1): granted, proceed
      → Bit unset (0): return 403
  → No DB hit for permission check (permission.id cached in memory at startup)
```

### 5.4 Permission Cache Invalidation Flow

```
Admin changes user role/permission
  → Update user_role or user_permission table
  → Increment user.permission_version (per-user, NOT global)
  → If role_permission changed: increment permission_version for ALL users with that role
Next token refresh by user
  → Compare user.permission_version with user_permission_cache.permission_version
  → Mismatch: recompute from DB (roles + direct denies + is_active filter)
  → Encode as bitmap, update user_permission_cache with new version
  → Issue new access_token with updated bitmap + version
```

### 5.5 Course Tree Load Flow

```
Client → GET /courses/{slug}/tree
  → Load course root nodes (parent_id IS NULL, course_id=X, ORDER BY position)
  → Return folder/lesson node list (lazy: don't load subtrees)
Client clicks folder to expand
  → GET /courses/{slug}/tree?parent={node_id}
  → Load direct children: filter(parent_id=node_id, course_id=X)
  → No recursive DB query needed (only direct children)
Client opens a lesson
  → GET /lessons/{lesson_id}
  → Load lesson content (content_md or video_url)
  → If lesson_type='miniquiz': load lesson_question data
  → Mark user_lesson_progress.started_at if first visit
```

### 5.6 Quiz WebSocket Flow (answer → check → next)

```
Client → WS connect: /ws/quiz/{quiz_id}/
  → Create user_quiz_attempt record (session start)
  → Server sends first question (from user_quiz_answer tracking which answered)
Client → send { question_id, answer_data }
  → Server validates answer (check options or fill_blank match)
  → Store user_quiz_answer record
  → Compute score_obtained
  → Update user_quiz_attempt.total_score
  → Send { is_correct, explanation, correct_answer } back to client
  → Send next unanswered question OR finish signal
Client → receives finish signal
  → Server marks attempt.finished_at
  → Update user_quiz_progress via signal (best_score, attempt_count, etc.)
WS disconnect
```

### 5.7 Challenge Flag Submission Flow

```
Client → POST /challenges/{slug}/submit { flag }
  → Validate user is authenticated
  → Load challenge_flag records for this challenge
  → Check submitted flag against each flag definition:
      → static flag: direct string compare (case sensitive per flag.is_case_sensitive)
      → regex flag: regex match
      → instance-specific flag: compare against challenge_instance.flag_value for this user
  → If match found:
      → Create/update user_challenge_progress (set completed_at)
      → Create user_challenge_submit (is_correct=TRUE)
      → Update user_profile counter (challenge_completed, total_challenge_point)
      → Trigger notification (auto_challenge_complete)
      → Return { correct: true }
  → If no match:
      → Create user_challenge_submit (is_correct=FALSE)
      → Return { correct: false }
  → Flag values NEVER returned to client
```

---

## 6. Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  App Router │ React │ Zustand (state) │ Axios (HTTP)        │
│             │       │                 │ WS client (quiz)    │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTP / WebSocket
┌─────────────▼───────────────────────────────────────────────┐
│                      Backend (Django)                        │
│  DRF APIViews         │  Django Channels (WebSocket)         │
│  JWT middleware       │  Daphne ASGI server                  │
│  Custom RBAC          │                                      │
│  ┌────────────────────┴──────────────────┐                  │
│  │ Apps: api │ auth_app │ realtime      │                  │
│  │       (ai — DEFERRED, not active)    │                  │
│  └───────────────────────────────────────┘                  │
│  Service Layer: auth_app/services/, <app>/services/, ...    │
└─────────────┬───────────────────────────────────────────────┘
              │ ORM queries
┌─────────────▼───────────────────────────────────────────────┐
│                      PostgreSQL Database                     │
│  Schema: DATA_MODEL.md (authoritative); dbv3.sql (legacy)   │
└─────────────────────────────────────────────────────────────┘
              │                    │                    │
┌─────────────▼──┐    ┌───────────▼──┐    ┌───────────▼──┐
│   Authentik    │    │    Outline   │    │    GitLab    │
│  (SSO/OAuth2)  │    │  (content)   │    │  (challenges)│
└────────────────┘    └──────────────┘    └──────────────┘
```

---

## 7. What NOT To Do

### Authorization
- ❌ **Never use Django's built-in permission system** (`django.contrib.auth` permissions / `has_perm()`) — this project uses a custom API-based RBAC
- ❌ **Never check permissions by hitting DB per request** — permissions are encoded as bitmap in JWT; check the bit
- ❌ **Never allow modifying permissions via API** — permissions are read-only; `is_active` is controlled only by startup scan
- ❌ **Never allow deleting permissions** — they become inactive but stay in DB
- ❌ **Never allow deleting or modifying built-in roles** (`is_system=TRUE`) via API — their permissions are synced at startup
- ❌ **Never use permission hierarchy** (parent/child) — permissions are flat; roles provide grouping
- ❌ **Never use DB triggers for denormalized field updates** — all sync via Django signals at app level
- ❌ **Never deploy with `auth.authorization_enabled=false` in production** — dev-only bypass for testing other features

### Tree / Nodes
- ❌ **Never bypass Node models to access content directly** — all tree operations go through `*Node` models
- ❌ **Never use recursive SQL** for subtree queries — use `path` field + `parent_id` filter for lazy loading
- ❌ **Never forget to update `path` on node move** — update self and ALL descendants

### Database
- ❌ **Never store plaintext refresh tokens** — always hash before storing in `user_session.refresh_token_hash`
- ❌ **Never expose flag values to client** — flag checking is server-side only
- ❌ **Never use Django's `ManyToManyField`** for M2M relationships — use explicit join tables
- ❌ **Never hardcode external service URLs** (Outline, GitLab) in model fields — use `system_config` keys
- ❌ **Never add a circular FK** between quiz and quiz_node — `quiz_node.quiz_id → quiz` only (one-way)

### Auth
- ❌ **Never create the custom User model after the first migration** — `AUTH_USER_MODEL` must be set before `manage.py migrate`
- ❌ **Never store secrets in `settings.py`** for production — use environment variables

### AI (Deferred Feature)
- ❌ **Never activate the `ai` app** without explicit approval — it is NOT in `INSTALLED_APPS` and its URLs are NOT wired
- ❌ **When AI is eventually implemented:** never return flag/challenge solutions from AI prompts

---

## 8. Code Conventions Reference

> Full conventions in `AGENT.md`. Key highlights:

**Django Models:**
- Inherit from `FullAudit` (or `CreateAudit` for join tables)
- Always set `db_table` on concrete models
- Always set `db_column` on FK fields
- Use `TextChoices` for all enums
- Use explicit join tables for M2M (not `ManyToManyField`)

**Project Layout:**
- New app URLs in `<app>/urls.py`, include into `backend/urls.py`
- Services in `<app>/services/`
- API views use DRF `APIView` or `GenericAPIView`

**Permission System:**
- Auto-discover on startup (scan registered endpoints)
- Permission names auto-generated from `{app_label}.{ViewClassName}.{http_method}`
- Built-in roles auto-created via `@add_role_granted('Admin', 'Editor', 'Member')` decorator
- Encode as binary bitmap (base64) in JWT access token
- Check bitmap bit in DRF permission class (no DB hit)
- Permissions are read-only via API (no admin PATCH/DELETE)

---

## 9. Non-Functional Requirements

| Requirement | Approach |
|-------------|----------|
| PostgreSQL leverage | Use `text_pattern_ops` indexes, JSONB, partial indexes |
| JWT auth | SimpleJWT + custom claims for permissions |
| Multi-device | `user_session` table per device/refresh token |
| Rate limiting | Per-endpoint rate limiting on auth endpoints (brute-force protection) |
| Error handling | Catch at each layer; re-raise typed exceptions; return meaningful error messages |
| Logging | FE + BE + DB logging (planned) |
| Flexible external services | Base URLs in `system_config`, not per-record |
| i18n | `next-intl` (installed, not configured yet) |
| Theming | Tailwind CSS (not configured yet) |

---

## 10. Implementation Order (Recommended)

See **`docs/IMPL_PLAN.md`** for the full vertical slice plan (Slices 0–11).

> **⚠️ Priority principle:** Functional requirements first; non-functional requirements only when necessary or after all functional requirements are complete.
> See `docs/DECISIONS.md` → R-DEV-02.

> **⚠️ AuthZ Bypass:** `auth.authorization_enabled=false` allows feature slices to be developed without waiting for Slice 2 to be completed.
> See `docs/DECISIONS.md` → R-DEV-01.

High-level sequence:
1. Slice 0 — Foundation (User model, migrations, system_config seed)
2. Slice 1 — Authentication (JWT, SSO, sessions)
3. Slice 2 — Authorization (RBAC, permission auto-discovery, JWT encoding) — *can be parallel with 3–8 using authZ bypass*
4. Slice 3 — System Config CRUD API
5. Slice 4 — Frontend Foundation (layout, stores, i18n)
6. Slices 5–8 — Content features (Learn, Challenge, Quiz, Profile)
7. Slices 9, 11 — Notifications, Statistics
8. **Slice 10 (AI Assistant) — DEFERRED** — do not implement until explicitly approved

> **⚠️ `docs/STATUS.md`** is the authoritative record of what is done and what is next.
