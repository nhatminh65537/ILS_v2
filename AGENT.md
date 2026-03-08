# AGENT.md — ILS v2 (Integrated Learning System)

> This document is the primary reference for any AI agent continuing work on this project.
> Read it fully before making any code changes.

---

## Project Overview and Goals

ILS v2 is a **self-hosted cybersecurity learning platform** for small organizations (~100 members). One instance corresponds to one organization. The system is intentionally not designed for horizontal scale.

**Three pillars of learning:**
1. **Learn** — Structured courses with lessons (markdown/video/miniquiz) and progress tracking
2. **Challenge** — CTF-style challenges with flag submission, instance deployment, GitLab sync
3. **Quiz** — Self-practice knowledge review via WebSocket-driven Q&A sessions

**User roles:** Admin (full system access), Editor (content management), Member (content consumption)

**External integrations planned:**
- **Authentik** — SSO provider (primary auth)
- **Outline** — Wiki/document storage for lesson content
- **GitLab** — Challenge source and deploy code

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.1.1 |
| Frontend UI | React | 19.2.3 |
| Frontend styling | Tailwind CSS | v4 |
| Frontend state | Zustand | ^5.0.9 |
| Frontend i18n | next-intl | ^4.7.0 |
| Frontend HTTP | Axios | ^1.13.2 |
| Backend | Django | 6.0 |
| Backend API | Django REST Framework | latest |
| Backend auth | djangorestframework-simplejwt | latest |
| Backend realtime | Django Channels + Daphne | latest |
| Database | PostgreSQL (dev: SQLite) | latest |
| Python | 3.13 | in `.venv` |

**Key architecture decisions (from requirements):**
- **API-based authorization** (not resource-based): users can access all published content
- **Fine-grained RBAC**: permissions are API-scoped, roles are permission bundles
- **JWT permission claims**: permissions encoded in access token for fast checks
- **Permission hierarchy**: parent disabled → children disabled (checked at revoke time, not check time)
- **Permission cache**: `user_permission_cache` table stores pre-encoded permissions; invalidated when admin changes user's permissions
- **Materialized Path** pattern on all tree nodes (`pre_path`) to avoid N+1 queries
- **Separate node/item architecture**: folders and content items are both `Node` records; all tree operations go through nodes

---

## Directory Structure

```
ILS_v2/
├── CLAUDE.md               # AI agent rules (OpenMemory integration)
├── AGENT.md                # This file
├── README.md               # Empty placeholder
├── setup.txt               # Setup commands reference
├── prompt.txt              # Scratchpad/prompts (not project code)
├── openmemory.md           # OpenMemory project index
│
├── design/
│   ├── api/                # API design docs (empty, to be filled)
│   ├── database/
│   │   ├── v1/             # Per-table SQL files (group_user, group_challenge, etc.)
│   │   └── vx/
│   │       ├── dbv2.sql    # Intermediate schema
│   │       └── dbv3.sql    # AUTHORITATIVE schema — use this as source of truth
│   └── ui/                 # UI designs (empty)
│
├── backend/
│   ├── manage.py
│   ├── backend/            # Django project config
│   │   ├── settings.py     # Currently using SQLite; PostgreSQL config commented out
│   │   └── urls.py         # Only admin/ registered; app URLs not yet included
│   ├── api/                # Main app — all domain models live here
│   │   └── models.py       # ~1195 lines — complete ORM for all domains
│   ├── ai/                 # AI assistant feature
│   │   ├── models.py       # AIRequest model
│   │   ├── views.py        # AIAskView (POST /ask/)
│   │   ├── serializers.py  # AIRequestSerializer
│   │   ├── constants.py    # AImode enum: learn_assistant, editor_assistant, learning_path
│   │   ├── url.py          # path("ask/", AIAskView)
│   │   └── services/
│   │       ├── context_loader.py   # Loads Lesson/Challenge context
│   │       ├── prompt_builder.py   # Builds prompts for 3 AI modes
│   │       └── llm_client.py       # MOCK — returns hardcoded string
│   └── realtime/           # WebSocket app (empty — no logic yet)
│
└── frontend/
    ├── package.json
    ├── app/
    │   ├── layout.tsx      # Default Next.js layout (not customized)
    │   └── page.tsx        # Default Next.js home page (not customized)
    └── public/             # Default Next.js assets
```

---

## Key Conventions in Existing Code

### Backend (Django)

**Abstract base models** — all domain models inherit from these (defined in `api/models.py`):
- `CreateAudit` — adds `created_at`, `created_by`
- `UpdateAudit` — adds `updated_at`, `updated_by`
- `FullAudit(CreateAudit, UpdateAudit)` — used by virtually all models
- `SoftDeleteAudit` — adds `deleted_at`, `deleted_by`, `is_deleted` property
- `BaseNode(FullAudit)` — tree node with `parent`, `is_item`, `title`, `pre_path`, `position`
- `BaseCategory(FullAudit)` — `name` (unique), `description`
- `BaseTag(FullAudit)` — `name` (unique), `description`

**Tree node pattern** — each domain (challenge/course/quiz) has a `*Node` model extending `BaseNode`:
- `ChallengeNode` → links to `Challenge`
- `CourseNode` → links to `Course` + `Lesson`
- `QuizNode` → links to `Quiz`
- `pre_path` stores materialized path like `/1/3/10/` for fast subtree queries
- `is_item=False` → folder; `is_item=True` → content item

**Status enum pattern** used on all content models:
```python
class Status(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'
```

**db_table always explicitly set** on concrete models (e.g., `db_table = 'challenge'`)

**db_column explicitly set** on ForeignKey fields (e.g., `db_column='category_id'`)

**related_name pattern**: `related_name='%(class)s_created'` on abstract model FKs; explicit names on concrete models

**M2M via explicit join tables** (not Django's `ManyToManyField`): `ChallengeTagMap`, `CourseTagMap`, `QuizTagMap`, `LessonQuestion`

**AI services layer** — `ai/` separates concerns:
- `context_loader.py` — fetches domain context from DB
- `prompt_builder.py` — constructs LLM prompts per mode
- `llm_client.py` — wraps LLM API (currently mock)

### Frontend

- **App Router** (Next.js 13+ style) in `frontend/app/`
- **TypeScript** throughout
- **Tailwind CSS v4** for styling
- **Zustand** for global state management
- **next-intl** for i18n (multi-language support planned)
- **Axios** for HTTP calls

---

## What's Implemented vs. What's Planned

### Implemented

| Area | Status | Notes |
|------|--------|-------|
| Django project scaffold | ✅ Done | Apps: `api`, `ai`, `realtime` |
| All domain ORM models | ✅ Done | Challenge, Course, Quiz + tree nodes, flags, progress, instances (~1195 lines) |
| Abstract base models | ✅ Done | CreateAudit, UpdateAudit, FullAudit, SoftDeleteAudit, BaseNode, BaseCategory, BaseTag |
| Database schema review | ✅ Done | All CRITICAL/HIGH/MEDIUM/LOW issues in `dbv3.sql` and `models.py` fixed (2026-03-09) |
| AI services scaffold | ✅ Done | 3 modes: learn_assistant, editor_assistant, learning_path |
| AI endpoint | ✅ Done | `POST /ask/` (but not wired into main urls.py) |
| Database schema design | ✅ Done | `design/database/vx/dbv3.sql` is authoritative |
| Next.js scaffold | ✅ Done | Default create-next-app, all deps installed |

### Known Bugs

| Bug | Location | Description |
|-----|----------|-------------|
| Typo in serializer | `ai/serializers.py:6` | `"lern_assistant"` should be `"learn_assistant"` |
| Wrong field reference | `ai/models.py:18` | `self.mode` doesn't exist; field is `node` (or should be `context_type`) |
| AI app not in INSTALLED_APPS | `settings.py` | `ai` is missing from `INSTALLED_APPS` |
| AI urls not registered | `backend/urls.py` | `ai.url` not included in root urlconf |
| LLM client is mock | `ai/services/llm_client.py` | Returns hardcoded string, no actual LLM call |

### Planned / Not Yet Implemented

| Area | Priority | Notes |
|------|----------|-------|
| Custom User model | High | Extend AbstractUser with `permission_version` field |
| JWT authentication | High | Login, register, refresh token, logout |
| SSO / Authentik | High | OAuth2/OIDC via goauthentik |
| User identity (SSO link) | High | `user_identity` table in schema |
| User session table | High | Multi-device refresh token tracking |
| Permission/RBAC system | High | Hierarchical API-based permissions, JWT claims encoding |
| `user_permission_cache` | High | Pre-encoded permissions for fast JWT generation |
| Permission auto-discovery | High | Scan endpoints at startup, auto-create permission records |
| All API views/serializers | High | Nothing wired up yet except `ai/ask/` |
| System config table | High | Runtime configuration for admin |
| Course API | Medium | CRUD for courses, nodes, lessons; progress tracking |
| Challenge API | Medium | CRUD, flag submission, tree navigation |
| Quiz WebSocket | Medium | Real-time Q&A with answer → check → next flow |
| Outline integration | Medium | Sync lesson content from self-hosted Outline |
| GitLab integration | Medium | Import/sync challenge from GitLab project |
| Instance deployment | Low | CTF per-user container/VM spin-up |
| Notification system | Low | Broadcast + automated notifications |
| User profile / settings | Low | Profile page, achievement display |
| Leaderboard / statistics | Low | Per-category rankings |
| Frontend pages | Low | Entire frontend is default scaffold |
| Audit log | Low | `audit_log` table designed, not implemented |
| Rate limiting | Low | Anti-brute-force for auth endpoints |
| i18n | Low | next-intl installed, not configured |
| Theming | Low | Tailwind, not configured |

---

## How to Run / Test the Project

### Prerequisites

- Python 3.13
- Node.js (LTS)
- PostgreSQL (for production) or use SQLite for dev

### Backend

```bash
# From ILS_v2 root
./.venv/Scripts/activate        # Windows
# or: source .venv/bin/activate # Unix

cd backend
python manage.py migrate
python manage.py runserver
```

The backend runs at `http://localhost:8000`. Django admin at `/admin/`.

**To use PostgreSQL** (uncomment in `settings.py`):
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

### Frontend

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:3000`.

### Running Daphne (WebSocket server)

```bash
cd backend
daphne -p 8000 backend.asgi:application
```

---

## Guidelines for AI Agents Continuing This Work

### Before Coding

1. **Read `design/database/vx/dbv3.sql`** — it is the authoritative schema. The ORM in `api/models.py` should match it. When in doubt about a field or relationship, the SQL wins.
2. **Check existing models** in `api/models.py` before creating any new model. All domain models are already defined; the work ahead is API layer, not more models.
3. **Check `CLAUDE.md`** for OpenMemory integration rules — search memory before implementing.

### Architecture Rules

- **Custom User model must be set before any migrations** — Django requires `AUTH_USER_MODEL` to point to your custom user before the first migration. The existing models use `settings.AUTH_USER_MODEL`. Create the custom user model in the `api` app and set `AUTH_USER_MODEL = 'api.User'` in `settings.py` first.
- **Never use Django's built-in permission system** for this project. The design uses a custom API-based permission system with JWT claims.
- **Permission check is JWT-claim-based** — encode permissions in access token, verify at API boundary. Do NOT hit DB per request for permission checks.
- **All tree operations go through Node models** — never bypass nodes to access content directly.
- **Use `pre_path` for subtree queries**: `ChallengeNode.objects.filter(pre_path__startswith='/1/3/')` — never recursive SQL.

### Implementation Order (Recommended)

1. Fix known bugs (serializer typo, AIRequest.mode field, INSTALLED_APPS, urls)
2. Create custom `User` model in `api`, set `AUTH_USER_MODEL`, run initial migrations
3. Implement JWT auth: register, login, refresh, logout with `user_session` tracking
4. Implement permission system: auto-discovery at startup, RBAC endpoints, JWT encoding
5. Implement `user_permission_cache` logic
6. Build CRUD APIs for courses, challenges, quizzes (following existing model patterns)
7. Add Outline and GitLab integrations
8. Implement Quiz WebSocket with Django Channels
9. Wire up frontend pages

### Code Style

- All new Django models **must** inherit from `FullAudit` (or `CreateAudit`/`UpdateAudit` as appropriate)
- All new models **must** set `db_table` and `db_column` on FK fields explicitly
- Use `TextChoices` for all enum-like fields (see `Challenge.Status`, `Challenge.Difficulty`)
- Use explicit join tables (not `ManyToManyField`) for M2M relationships
- Use `related_name` on all `ForeignKey` and `OneToOneField` fields
- Add `db_index=True` on fields used in filters/ordering; use `Meta.indexes` for composite indexes
- API views should use DRF's `APIView` or `GenericAPIView`; prefer serializers for I/O validation
- Services go in `<app>/services/` (see `ai/services/` as the pattern)
- Separate URL files per app (`ai/url.py` pattern), include into `backend/urls.py`

### Database Notes

- The `position` field on nodes and questions controls display order; maintain it on create/reorder
- `pre_path` must be maintained on create/move operations (update self + all descendants)
- `user_permission_cache.permission_version` must match `user.permission_version`; increment user's version when permissions change
- `challenge_node.pre_path` index uses `text_pattern_ops` — required for `LIKE '/1/3/%'` queries in PostgreSQL
- `user_session` stores `refresh_token_hash` (not plaintext) — hash before storing
- **Quiz↔QuizNode relationship**: QuizNode has `quiz_id → quiz` (one-way). Access node from quiz via reverse relation `quiz.node` (not a field — reverse accessor via `QuizNode.quiz` with `related_name='node'`)
- **Quiz category**: Quiz now has `category_id → quiz_category` (added 2026-03-09)
- **challenge_instance** has a partial unique index — only 1 `running` instance per (user, challenge). Enforced via `UniqueConstraint` with `condition=Q(status='running')` in ORM and partial index in SQL
- **user_quiz_progress** table: aggregate per-user per-quiz stats (best_score, attempt_count). Update via Django signal when `user_quiz_attempt` is saved
- **quiz.total_questions** is denormalized — sync via Django signal when quiz_question is added/deleted
- **permission.is_active** is local only — parent disabled logic handled at application level during JWT encoding (no DB cascade)
- **Join tables** (challenge_tag_map, course_tag_map, quiz_tag_map, role_permission): use CreateAudit only — no updated_at/updated_by
- **challenge.slug** added — URL-friendly identifier (unique, required)
- **lesson.title** added — required field for direct lesson queries
- **quiz_question.case_sensitive** is the single source of truth for fill_blank case sensitivity; quiz_question_answer does NOT have this field

### Security Reminders

- Never store plaintext tokens — always hash refresh tokens
- The `SECRET_KEY` in `settings.py` is insecure dev default — replace for any real deployment
- Rate-limit auth endpoints (brute-force protection per requirements)
- AI prompts must not return flags/solutions (`learn_assistant` mode enforces this)
- Challenge flags are checked server-side only; never expose flag values to client

### Integration Config Pattern

Per requirements: external service hostnames (Outline URL, GitLab URL) are stored in `system_config` table, not hardcoded. When integrating Outline or GitLab, always read the base URL from `system_config` so admins can change them without touching individual records.
