# ILS v2 — Implementation Plan (Vertical Slice)

> **Open questions and resolved decisions are tracked in `docs/DECISIONS.md`.**
> Before starting any slice, resolve all open questions tagged for that slice.

## Context

ILS v2 is a self-hosted cybersecurity learning platform (~100 members). The current codebase includes:
- Complete domain models (`backend/api/models.py` ~1200 lines)
- Django scaffold (apps: `api`, `ai`, `realtime`), Next.js scaffold
- SQL schema legacy reference (`design/database/vx/dbv3.sql`) — `docs/DATA_MODEL.md` is authoritative
- **Partially implemented:** API views/serializers/URLs exist for core domains; auth app contracts and many slice contracts remain pending

Each **slice** = a complete feature from DB → API → Frontend.
Each **task** = completed in one session (2–4 hours).

### ⚠️ Implementation Priority Principle

> **Functional requirements (high priority) > Non-functional requirements (low priority)**
>
> Non-functional requirements (logging, rate limiting, i18n, theming, CDN, pagination
> optimization, caching, etc.) should only be implemented when:
> 1. They are prerequisites for a feature to run (for example, JWT auth for login)
> 2. All functional requirements of that slice are complete
> 3. They are explicitly requested by the team
>
> See decision: [R-DEV-02](DECISIONS.md) — Functional Requirements Priority

### ⚠️ AuthZ Bypass for Development

> `system_config[auth.authorization_enabled]` (default `true`) allows RBAC checks to be disabled
> so feature slices can be developed without waiting for Slice 2 to finish. When `false`:
> - Any authenticated user bypasses permission checks
> - Authentication is still required
> - **MUST** be `true` in production
>
> See: [R-DEV-01](DECISIONS.md) — Authorization Bypass Toggle
> See: `docs/CONFIG.md` → `auth.authorization_enabled`

---

## Dependency Graph

```
Slice 0 (Foundation: bugs, User model, migrations)
  └── Slice 1 (Authentication: login, JWT, SSO, sessions)
        ├── Slice 2 (Authorization: RBAC, permissions, JWT claims)
        │     ├── Slice 3 (System Config CRUD)
        │     └── [authZ fully enforced in production]
        ├── Slice 4 (Frontend Foundation: layout, stores, i18n)
        │     ├── Slice 5 (Learn: courses, lessons, progress)
        │     ├── Slice 6 (Challenge: CTF, flags, instances)
        │     ├── Slice 7 (Quiz: WebSocket Q&A)
        │     └── Slice 8 (User Profile & admin)
        ├── Slice 9  (Notifications)   ← needs 5+6+7 signals
        ├── Slice 10 (AI Assistant)    ← needs 5+6 context ← DEFERRED
        └── Slice 11 (Statistics)      ← needs 5+6+7 data
```

### Parallel Development Note

With `auth.authorization_enabled=false`, feature slices (3–9, 11) can be developed
**in parallel with Slice 2** as long as Slice 0 + Slice 1 are complete. Slice 2 only must be
completed before production deployment (with `auth.authorization_enabled=true`).

```
Parallel dev path (with authZ bypass):

Slice 0 → Slice 1 →─┬─ Slice 2 (RBAC)           ─────────┬─ production deploy
                    │                                    │
                    ├─ Slice 3 (System Config)  ─────────┤
                    ├─ Slice 4 (Frontend Found) ─┬───────┤
                    │                            ├─ S5   │
                    │                            ├─ S6   │
                    │                            ├─ S7   │
                    │                            └─ S8   │
                    ├─ Slice 9  (Notifications)  ────────┤
                    └─ Slice 11 (Statistics)     ────────┘
```

### Priority Within Each Slice

Within each slice, prioritize in this order:
1. **Backend API (functional)** — CRUD, business logic, signals
2. **Backend API (non-functional)** — rate limiting, caching, logging (only when needed)
3. **Frontend (functional)** — basic UI, forms, data display
4. **Frontend (non-functional)** — i18n, theming, animation, accessibility (only when needed)

### API Documentation Workflow

After completing any endpoint implementation or endpoint contract change:
1. Update `docs/API.md` in the same session.
2. Reconcile active/planned status in `docs/STATUS.md`.
3. If sequencing or scope changed, update the affected slice tasks in this plan.

---

## Slice 0 — Foundation

> **Decision prerequisites:** [Q-AUTH-02](DECISIONS.md#q-auth-02-first-admin-creation-mechanism) (first admin setup) — **RESOLVED (2026-03-17)**

### Task 0.1 — Fix known bugs ✅ COMPLETED (2026-03-09)

All bugs fixed. See `docs/BUGS.md` for full history (F1–F7).

> **Note:** The `ai` app is intentionally **not** in `INSTALLED_APPS` and its URLs are **not** wired.
> AI is a deferred feature — see Slice 10 below and `docs/STATUS.md → Deferred Features`.

### Task 0.2 — Custom User model + initial migrations
**Files:** `backend/api/models.py`, `backend/backend/settings.py`, `backend/api/migrations/`

- Add `User(AbstractBaseUser, PermissionsMixin)` to `api/models.py`:
  ```python
  class User(AbstractBaseUser):
      username = models.CharField(max_length=150, unique=True, db_column='username')
      email = models.EmailField(blank=True, null=True, db_column='email')
      password = models.CharField(max_length=255, null=True, blank=True)  # nullable for SSO-only
      is_active = models.BooleanField(default=True, db_column='is_active')
      is_staff = models.BooleanField(default=False)
      permission_version = models.IntegerField(default=0, db_column='permission_version')
      date_joined = models.DateTimeField(auto_now_add=True)
      USERNAME_FIELD = 'username'
      class Meta:
          db_table = 'user'
  ```
- Set `AUTH_USER_MODEL = 'api.User'` in `settings.py`
- Verify `UserProfile`, `UserIdentity`, `UserSession` models match dbv3.sql schema
- Run: `python manage.py makemigrations api && python manage.py migrate`
- Create `UserManager` with `create_user()`, `create_superuser()`

### Task 0.3 — SystemConfig + seed command
**Files:** `backend/api/management/commands/seed_config.py`, `backend/api/models.py`

- Verify `SystemConfig` model in `api/models.py` matches dbv3.sql:
  ```python
  class SystemConfig(CreateAudit):
      key = models.CharField(max_length=100, unique=True)
      value = models.TextField()
      value_type = models.CharField(...)  # bool/int/string/secret/json
      category = models.CharField(max_length=50)
      is_editable = models.BooleanField(default=True)
      is_runtime = models.BooleanField(default=True)
      class Meta: db_table = 'system_config'
  ```
- Management command `seed_config` (canonical keys from `docs/CONFIG.md`):
  ```python
  DEFAULT_CONFIGS = [
      {'key': 'auth.local_login_enabled', 'value': 'true', 'value_type': 'boolean', 'category': 'auth'},
      {'key': 'auth.registration_enabled', 'value': 'true', 'value_type': 'boolean', 'category': 'auth'},
      {'key': 'auth.sso_enabled', 'value': 'false', 'value_type': 'boolean', 'category': 'auth'},
      {'key': 'auth.link_accounts_enabled', 'value': 'false', 'value_type': 'boolean', 'category': 'auth'},
      {'key': 'auth.authorization_enabled', 'value': 'true', 'value_type': 'boolean', 'category': 'auth'},
      # ai.* keys added when Slice 10 (AI) is activated
  ]
  ```
- Helper `get_config(key, default=None)` in `api/utils.py` for fast system_config reads

---

## Slice 1 — Authentication

> **Decision prerequisites:** all blockers for Slice 1 were resolved by 2026-03-24.
> - [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — RESOLVED: namespaced domain routes (`/api/auth/*`, `/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`)
> - [Q-INFRA-03](DECISIONS.md#q-infra-03-email-backend-for-password-reset) — RESOLVED: defer password reset email flow (Task 1.4) to follow-up session
> - [Q-INFRA-04](DECISIONS.md#q-infra-04-cache-backend-for-rate-limiting) — RESOLVED: LocMem in dev, Redis required for production-grade rate limiting
> - [Q-INFRA-06](DECISIONS.md#q-infra-06-client-side-token-storage) — RESOLVED: memory-only token storage + refresh flow
> - [Q-AUTH-01](DECISIONS.md#q-auth-01-default-role-for-new-users) — RESOLVED: auto-assign Member role on registration
> - [Q-AUTH-03](DECISIONS.md#q-auth-03-sso-only-lockout-fallback) — RESOLVED: always allow local login for `is_superuser=True` as emergency fallback
> - [Q-SLICE1-01](DECISIONS.md#q-slice1-01-member-role-seeding) — RESOLVED (Option A): add idempotent `seed_roles` bootstrap step before registration flow
> - [Q-INFRA-01](DECISIONS.md#q-infra-01-frontend-source-directory) — RESOLVED (Option A): keep `frontend/app/` layout and align plan paths accordingly
> - [Q-AUTH-04](DECISIONS.md#q-auth-04-jwt-token-expiry-and-refresh-strategy) — RESOLVED (Option A): 15m access / 7d refresh with silent refresh on 401
> - [Q-AUTH-05](DECISIONS.md#q-auth-05-first-login-admin-ceremony) — RESOLVED (Option C): temporary default bootstrap password + forced reset on first login
>
> **PRD:** `docs/prd/01-authentication.md`
> **New app:** `backend/auth_app/` (to avoid conflict with Python `auth`)

### Task 1.1 — auth_app setup + native login/register/logout

**Files to create:**
```
backend/auth_app/
├── __init__.py
├── apps.py
├── urls.py                  # app-level URLs
├── views.py                 # auth views
├── serializers.py           # request/response schemas
└── services/
    ├── __init__.py
    └── token_service.py     # JWT generation
```

**URLs:**
```python
# auth_app/urls.py
urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('logout-all/', LogoutAllView.as_view()),
]
```

**Register** (`POST /api/auth/register/`):
- Input: `{username, password, email?}`
- Validate: username unique, len(password) >= 8
- Check `system_config[auth.registration_enabled]` → 403 if false
- Check `system_config[auth.local_login_enabled]` → 403 if false
- Create: `User` + `UserProfile(user=user)` in transaction
- Return: `{access, refresh, user: {id, username}}`

**Login** (`POST /api/auth/login/`):
- Check `system_config[auth.local_login_enabled]`
- Authenticate via `check_password()`
- Rate limiting: cache-based counter:
  ```
  cache_key = f"login_fail:{username}"
  fail_count = cache.get(cache_key, 0)
  if fail_count >= 5: return 429
  ```
- Create `UserSession(user, device_info, refresh_token_hash, expires_at)`
- `refresh_token_hash` = `hashlib.sha256(raw_token.encode()).hexdigest()`
- Return: `{access, refresh, user: {id, username, email}}`

**Logout** (`POST /api/auth/logout/`):
- Extract refresh token from body
- Hash it → query `UserSession` → set `revoked_at = now()`

### Task 1.2 — JWT with permission claims + token refresh

**File:** `backend/auth_app/services/token_service.py`

```python
class TokenService:
    def issue_tokens(self, user) -> dict:
        # 1. get_or_refresh_permission_cache(user) → list[str]
        # 2. access_token = RefreshToken for user
        # 3. access_token['permissions'] = permission_list
        # 4. access_token['permission_version'] = user.permission_version
        # 5. raw_refresh = str(refresh)
        # Return {'access': str(access), 'refresh': raw_refresh}

    def get_or_refresh_permission_cache(self, user) -> list[str]:
        # Stub: return [] in Slice 1; full logic in Slice 2
        return []
```

**Token refresh** (`POST /api/auth/token/refresh/`):
```
Input: {refresh: "<raw_token>"}
1. hash incoming token
2. query UserSession(refresh_token_hash=hash, revoked_at__isnull=True)
3. if not found → 401
4. if session.expires_at < now() → 401
5. issue new access token (check permission cache)
6. optional token rotation: new refresh + revoke old session
```

**JWT Payload schema:**
```json
{
  "user_id": 42,
  "username": "alice",
  "permissions": ["learn.view", "challenge.submit"],
  "permission_version": 7,
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Task 1.3 — SSO / Authentik OIDC

**File:** `backend/auth_app/services/sso_service.py`

```python
class AuthentikSSOService:
    def get_redirect_url(self) -> str:
        # Read from system_config: auth.authentik_host, auth.client_id
        # Build OIDC authorization URL with state + nonce (store in session/cache)

    def handle_callback(self, code: str) -> User:
        # Exchange code → id_token via Authentik token endpoint
        # Extract: external_id (sub), email, name
        # Look up UserIdentity(provider='authentik', external_id=sub)
        # If not found: create User + UserProfile + UserIdentity
        # Return user
```

**Endpoints:**
- `GET /api/auth/sso/redirect/` — check `auth.sso_enabled`, redirect
- `GET /api/auth/sso/callback/` — exchange code, issue JWT, redirect frontend with token
- `POST /api/auth/identity/link/` — add UserIdentity to authenticated user

### Task 1.4 — Password change/reset + session management

> **Status note (2026-03-23):** Password reset email flow is deferred per [Q-INFRA-03](DECISIONS.md#q-infra-03-email-backend-for-password-reset). Password change and session management can still proceed.

**Endpoints:**
```
POST /api/auth/password/change/        → verify current_password, update, revoke all sessions
POST /api/auth/password/reset/         → send HMAC-signed link via email (1hr expiry)
POST /api/auth/password/reset/confirm/ → verify token, update password, revoke all sessions
GET  /api/auth/sessions/               → list UserSession(revoked_at=null, expires_at>now)
DELETE /api/auth/sessions/{id}/        → set revoked_at = now()
```

**Password reset token (no DB storage):**
```python
# Use itsdangerous TimestampSigner
signer = TimestampSigner(settings.SECRET_KEY)
token = signer.sign(str(user.id))
# Verify: signer.unsign(token, max_age=3600)
```

### Task 1.5 — Frontend: Login/Register UI

**Files to create:**
```
frontend/src/
├── lib/
│   ├── api.ts              # Axios instance + interceptors
│   └── auth.ts             # token storage helpers
├── store/
│   └── authStore.ts        # Zustand: {user, isAuth, login, logout, refreshToken}
└── app/(auth)/
    ├── layout.tsx           # centered card layout
    ├── login/page.tsx       # login form + SSO button
    └── register/page.tsx    # register form
```

**Axios interceptor** (`lib/api.ts`):
```typescript
// On 401 response: call /auth/token/refresh/ automatically
// On refresh failure: redirect to /login
// Attach Authorization: Bearer <access_token> to all requests
```

**Auth store** (`store/authStore.ts`):
```typescript
interface AuthState {
  user: { id: number; username: string; email: string } | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  loginSSO: () => void  // redirect to /api/auth/sso/redirect/
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
}
```

---

## Slice 2 — Authorization / RBAC

> **Decision prerequisites (must resolve before coding):**
> - [Q-AUTH-01](DECISIONS.md#q-auth-01-default-role-for-new-users) — Default role + seed roles strategy
>
> **PRD:** `docs/prd/02-authorization.md`

### Task 2.1 — Permission auto-discovery at startup

**Files:**
```
backend/auth_app/
├── apps.py                          # ready() hook
└── services/
    └── permission_discovery.py      # scan URL patterns
```

**Discovery algorithm:**
```python
def discover_permissions():
    # 1. Set all Permission.is_active = False
    # 2. Walk urlpatterns recursively
    # 3. For each URL pattern with a view class:
    #    - key = "app.method.resource" e.g. "challenge.list", "challenge.submit"
    #    - parent_key = "challenge" (group)
    #    - Upsert Permission(key=key, parent=parent_perm, is_active=True)
    # 4. Hook: AppConfig.ready() calls discover_permissions()
```

**Permission key convention:**
```
challenge              ← group (parent)
challenge.view         ← GET /api/challenges/
challenge.create       ← POST /api/challenges/
challenge.submit       ← POST /api/challenges/{slug}/submit/
learn.view             ← GET /api/courses/
learn.lesson.view      ← GET /api/lessons/{id}/
admin.users.manage     ← admin-level
```

### Task 2.2 — Role/Permission CRUD API

**Files:** `backend/api/views/rbac.py`, `backend/api/serializers/rbac.py`, `backend/api/urls.py`

**Endpoints:**
```
GET  /api/roles/                             → list roles
POST /api/roles/                             → create role (admin only)
GET/PUT/DELETE /api/roles/{id}/              → role detail
GET  /api/roles/{id}/permissions/            → permissions assigned to role (tree)
POST /api/roles/{id}/permissions/            → assign permission {permission_id, is_active}
DELETE /api/roles/{id}/permissions/{perm_id}/ → revoke permission from role

GET  /api/permissions/                       → list all permissions (tree structure)

GET  /api/users/{id}/roles/                  → user's current roles
POST /api/users/{id}/roles/                  → assign role to user {role_id}
DELETE /api/users/{id}/roles/{role_id}/      → remove role from user
```

**DRF Permission class:**
```python
class HasJWTPermission(BasePermission):
    def __init__(self, permission_key: str):
        self.permission_key = permission_key

    def has_permission(self, request, view):
        # Dev bypass: skip permission check if authZ disabled
        if not get_config('auth.authorization_enabled', True):
            return True
        token_permissions = request.auth.get('permissions', [])
        return self.permission_key in token_permissions
```

### Task 2.3 — user_permission_cache + JWT encoding

**File:** `backend/auth_app/services/permission_service.py`

```python
class PermissionService:
    def compute_user_permissions(self, user) -> list[str]:
        # 1. Get all roles assigned to user (UserRole table)
        # 2. For each role: get RolePermission records
        # 3. For each permission: check is_active
        # 4. Apply hierarchy: if parent is_active=False → child effectively disabled
        #    (walk permission tree application-level, NOT DB cascade)
        # 5. Return list of active permission keys

    def get_or_refresh_cache(self, user) -> list[str]:
        # 1. Try UserPermissionCache where user=user
        # 2. If not found or permission_version != user.permission_version:
        #    perms = compute_user_permissions(user)
        #    update/create UserPermissionCache(...)
        # 3. Return cached permissions

    def invalidate_cache(self, user):
        # Set user.permission_version += 1
        # Called when admin changes user's roles/permissions
```

### Task 2.4 — Frontend: Admin RBAC UI

**Files:**
```
frontend/src/app/admin/rbac/
├── page.tsx                  # Role list + permission tree
├── roles/[id]/page.tsx       # Role detail: assign permissions
└── users/[id]/roles/page.tsx # User → role assignment
```

---

## Slice 3 — System Config

> **PRD:** `docs/prd/10-system-config.md`

### Task 3.1 — System Config API

**Files:** `backend/api/views/system_config.py`, `backend/api/serializers/system_config.py`

**Endpoints:**
```
GET  /api/config/           → list all (grouped by category; secrets → "***")
GET  /api/config/{key}/     → single config value (secrets masked)
PUT  /api/config/{key}/     → update value (admin only)
```

**Value coercion by `value_type`:** `boolean` → bool, `int` → int, `json` → dict/list, `string` → str.
Secret values: `is_secret=True` → return `"***"` in GET.

### Task 3.2 — Frontend: System Config Admin UI

**Files:** `frontend/src/app/admin/config/page.tsx`

- Group configs by `category` (accordion per group)
- Field type per `value_type`: toggle (boolean), number (int), text (string)
- Secret fields: masked display, show/hide button, edit requires confirmation

---

## Slice 4 — Frontend Foundation

> **Decision prerequisites (must resolve before coding):**
> - [Q-INFRA-01](DECISIONS.md#q-infra-01-frontend-source-directory) — Frontend src/ directory layout
> - [Q-INFRA-06](DECISIONS.md#q-infra-06-client-side-token-storage) — Token storage method
> - [Q-INFRA-07](DECISIONS.md#q-infra-07-i18n-language-strategy) — i18n languages and timing
> - [Q-INFRA-08](DECISIONS.md#q-infra-08-frontend-ui-component-library) — UI component library choice

### Task 4.1 — App structure + shared infrastructure

**Directory structure:**
```
frontend/src/
├── app/
│   ├── layout.tsx                 # root: font, theme provider
│   ├── (auth)/                    # unauthenticated routes
│   │   ├── layout.tsx             # centered card
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                     # authenticated routes
│   │   ├── layout.tsx             # sidebar + header
│   │   ├── page.tsx               # dashboard/home
│   │   ├── learn/                 # Slice 5
│   │   ├── challenge/             # Slice 6
│   │   ├── quiz/                  # Slice 7
│   │   ├── profile/               # Slice 8
│   │   ├── notifications/         # Slice 9
│   │   └── leaderboard/           # Slice 11
│   └── admin/                     # admin-only routes
│       ├── layout.tsx             # admin sidebar
│       ├── rbac/                  # Slice 2
│       ├── config/                # Slice 3
│       ├── users/                 # Slice 8
│       └── stats/                 # Slice 11
├── components/
│   ├── ui/                        # Button, Input, Modal, Badge, etc.
│   ├── Tree/                      # Reusable lazy-load tree component
│   └── AIChatPanel/               # Slice 10
├── store/
│   ├── authStore.ts
│   └── notificationStore.ts
├── lib/
│   ├── api.ts                     # Axios instance + interceptors
│   └── ws.ts                      # WebSocket helper
└── i18n/
    ├── en.json
    └── vi.json
```

**Shared Tree component** (reused in Learn/Challenge/Quiz):
```typescript
interface TreeProps {
  items: TreeNode[]
  onExpand: (nodeId: number) => Promise<TreeNode[]>  // lazy load children
  onSelect: (node: TreeNode) => void
  renderIcon: (node: TreeNode) => React.ReactNode
}
```

---

## Slice 5 — Learn (Courses)

> **Decision prerequisites (must resolve before coding):**
> - [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — URL prefix (`/api/courses/` vs `/api/learn/courses/`)
> - [Q-LEARN-01](DECISIONS.md#q-learn-01-lesson-node-creation-atomicity) — Lesson node creation: 1-step or 2-step
> - [Q-LEARN-02](DECISIONS.md#q-learn-02-mini-quiz-question-source) — Mini-quiz question source (shared Quiz or separate)
> - [Q-LEARN-03](DECISIONS.md#q-learn-03-course-progress-on-structure-change) — Progress when course structure changes
> - [Q-LEARN-04](DECISIONS.md#q-learn-04-course-delete-strategy) — Course delete: soft-delete or archive
> - [Q-LEARN-05](DECISIONS.md#q-learn-05-slug-conflict-resolution) — Slug conflict resolution strategy
> - [Q-LEARN-06](DECISIONS.md#q-learn-06-outline-url-frontend-exposure) — Outline URL config exposure
> - [Q-LEARN-07](DECISIONS.md#q-learn-07-tag-creation-permissions) — Who can create/delete tags
> - [Q-LEARN-08](DECISIONS.md#q-learn-08-lesson-completion-trigger) — Lesson completion trigger (scroll enforcement)
> - [Q-LEARN-09](DECISIONS.md#q-learn-09-lesson-start-trigger) — Lesson start: implicit or explicit
> - [Q-LEARN-10](DECISIONS.md#q-learn-10-outline-sync-failure-handling) — Outline sync failure and timeout

### Task 5.1 — Course + Category CRUD API
**Files:** `backend/api/views/course.py`, `backend/api/serializers/course.py`, `backend/api/urls.py`

**Endpoints:**
```
GET  /api/courses/                    → list (filter: category, status, search)
POST /api/courses/                    → create (Editor+)
GET/PUT/DELETE /api/courses/{slug}/
GET  /api/course-categories/          → list
POST /api/course-categories/          → create (Admin)
GET/PUT/DELETE /api/course-categories/{id}/
GET  /api/course-tags/
```

**Course list response includes:** `user_progress: {completed, total}` if authenticated.

### Task 5.2 — CourseNode tree API
**Files:** `backend/api/views/course.py`

**Endpoints:**
```
GET  /api/courses/{slug}/tree/              → root nodes (parent=null)
GET  /api/courses/{slug}/tree/?parent={id}  → children of node (lazy load)
POST /api/courses/{slug}/tree/              → create node
PUT  /api/courses/{slug}/tree/{node_id}/    → rename, reorder, move
DELETE /api/courses/{slug}/tree/{node_id}/  → delete node + subtree
```

**Move node:** update `path` for self + all descendants using `bulk_update`.

### Task 5.3 — Lesson CRUD + Outline sync
**Endpoints:**
```
GET/PUT  /api/lessons/{id}/
POST     /api/lessons/{id}/sync/            → pull content from Outline API
GET/POST /api/lessons/{id}/questions/       → LessonQuestion CRUD
GET/PUT/DELETE /api/lesson-questions/{id}/
```

**Outline sync** reads `outline.url` from system_config.

### Task 5.4 — User progress tracking
**Endpoints:**
```
POST /api/lessons/{id}/start/        → mark started_at (idempotent)
POST /api/lessons/{id}/complete/     → mark completed_at (idempotent)
GET  /api/courses/{slug}/progress/   → {lesson_count, completed, percent}
```
**Signal chain:** `UserLessonProgress.completed_at` set → update `UserCourseProgress` → update `UserProfile`.

### Task 5.5 — Frontend: Course catalog + tree
```
learn/page.tsx             → course catalog (cards grid, filter sidebar)
learn/[slug]/page.tsx      → course detail with Tree component (lazy expand)
```

### Task 5.6 — Frontend: Lesson viewer
**File:** `frontend/src/app/(app)/learn/[slug]/[lessonId]/page.tsx`
- Markdown: `react-markdown` + `rehype-highlight`
- Video: `<video>` or iframe
- Miniquiz: inline question cards + answer reveal
- Left sidebar: course tree; right sidebar: progress + next/prev navigation

---

## Slice 6 — Challenge (CTF)

> **Decision prerequisites (must resolve before coding):**
> - [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — URL prefix convention
> - [Q-CHALL-01](DECISIONS.md#q-chall-01-challenge-instance-scope) — Challenge instances: MVP or deferred
> - [Q-CHALL-02](DECISIONS.md#q-chall-02-instance-deployment-protocol) — Instance deployment external system spec (if instances in MVP)

### Task 6.1 — Challenge CRUD API
**Files:** `backend/api/views/challenge.py`, `backend/api/serializers/challenge.py`

**Endpoints:** (same pattern as courses)
```
GET/POST /api/challenges/
GET/PUT/DELETE /api/challenges/{slug}/
GET/POST /api/challenge-categories/
GET/POST /api/challenge-tags/
```

### Task 6.2 — ChallengeNode tree + ChallengeFlag CRUD
**Endpoints:**
```
GET/POST /api/challenges/{slug}/tree/
PUT/DELETE /api/challenges/{slug}/tree/{id}/

GET/POST /api/challenges/{slug}/flags/         → editor/admin only; never returns values to Members
PUT/DELETE /api/challenges/{slug}/flags/{id}/
```

### Task 6.3 — Flag submission + progress
**File:** `backend/api/services/flag_service.py`

Server-side only flag checking: STATIC (string match), REGEX (re.match), INSTANCE (compare against running instance flag).

```
POST /api/challenges/{slug}/submit/   → {flag: "..."} → {correct: bool}
GET  /api/challenges/{slug}/progress/ → {solved: bool, attempt_count: int}
```

On correct: update `UserChallengeProgress` → signal → `UserProfile` counters.

### Task 6.4 — GitLab sync
```
POST /api/challenges/{slug}/gitlab-sync/   → admin/editor only
```
Reads `challenge.git.url` from system_config.

### Task 6.5 — Frontend: Challenge browser + tree
```
challenge/page.tsx            → catalog (filter by category, difficulty, tags)
challenge/[slug]/page.tsx     → detail + flag submit form
```

### Task 6.6 — Frontend: Challenge detail + flag submit
- Description (markdown), instance management panel, flag `<input>` + submit
- Result feedback: correct → success badge; incorrect → retry

---

## Slice 7 — Quiz

> **Decision prerequisites (must resolve before coding):**
> - [Q-INFRA-02](DECISIONS.md#q-infra-02-api-url-prefix-convention) — URL prefix convention
> - [Q-INFRA-05](DECISIONS.md#q-infra-05-websocket-jwt-auth-method) — WebSocket JWT auth method

### Task 7.1 — Quiz + Question CRUD API
**Files:** `backend/api/views/quiz.py`, `backend/api/serializers/quiz.py`

**Endpoints:**
```
GET/POST /api/quizzes/
GET/PUT/DELETE /api/quizzes/{id}/
GET/POST /api/quizzes/{id}/questions/
GET/PUT/DELETE /api/quiz-questions/{id}/
GET/POST /api/quiz-questions/{id}/options/
GET/PUT/DELETE /api/quiz-question-options/{id}/
GET/PUT /api/quizzes/{id}/config/
```

### Task 7.2 — QuizNode tree API
Same pattern as Course/Challenge nodes. **No circular FK** — `quiz_node.quiz_id → quiz` only (one-way).

### Task 7.3 — Django Channels WebSocket consumer

**Files:** `backend/realtime/consumers/quiz_consumer.py`, `backend/realtime/routing.py`

**Protocol:** `ws://host/ws/quiz/{quiz_id}/?token={jwt}`
```python
class QuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Verify JWT, create UserQuizAttempt, send first question

    async def receive(self, text_data):
        # Validate answer → store UserQuizAnswer → send result + next question

    async def disconnect(self, code):
        # Mark attempt.finished_at
```

**ASGI routing** added to `backend/backend/asgi.py`.

### Task 7.4 — Quiz progress tracking
**Signal:** `UserQuizAttempt` finished → update `UserQuizProgress` (best_score, attempt_count).

### Task 7.5 — Frontend: Quiz browser
```
quiz/page.tsx                → catalog + tree browser
quiz/[id]/page.tsx           → quiz detail + config
quiz/[id]/session/page.tsx   → active WebSocket quiz session
```

### Task 7.6 — Frontend: WebSocket quiz session
- WS connect on mount with JWT token
- Display question + options; submit answer; show result + explanation
- Finish screen: score, correct%, time elapsed

---

## Slice 8 — User Profile

### Task 8.1 — User profile API
```
GET/PUT /api/users/me/         → own profile + stats
GET     /api/users/{id}/       → public profile
GET     /api/users/me/activity/ → last 30 events
```

### Task 8.2 — Admin user management API
```
GET  /api/admin/users/         → list with filters
POST /api/admin/users/         → create user
PUT  /api/admin/users/{id}/    → update is_active, roles
```

### Task 8.3 — Frontend: Profile page
```
profile/[id]/page.tsx      → avatar, stats cards, activity timeline
profile/settings/page.tsx  → edit display_name, bio, avatar; change password
```

### Task 8.4 — Frontend: Admin user management
```
admin/users/page.tsx → user table with search, filter, paginate; row actions
```

---

## Slice 9 — Notifications

### Task 9.1 — Notification API
```
GET  /api/notifications/                   → list (unread first)
POST /api/notifications/{id}/read/         → mark read
POST /api/notifications/read-all/          → mark all read
GET  /api/notifications/unread-count/      → {count: N}
POST /api/admin/notifications/broadcast/   → admin broadcast
```

### Task 9.2 — Auto-trigger via signals
**File:** `backend/api/signals.py`

Django signals on `UserChallengeProgress`, `UserQuizAttempt`, `UserLessonProgress` → call `create_notification(user, type, data)`.

### Task 9.3 — WebSocket notification delivery
**File:** `backend/realtime/consumers/notification_consumer.py`

Channel group per user: `notifications_{user.id}`. Push new notifications real-time.

### Task 9.4 — Frontend: Notification bell + inbox
```
components/NotificationBell.tsx          → in header; unread count badge; WS subscription
app/(app)/notifications/page.tsx         → full inbox list + mark read
```

---

## Slice 10 — AI Assistant ⚠️ DEFERRED

> **Do NOT implement this slice until explicitly approved.**
> The `ai` app scaffold exists but is intentionally inactive.
> See `docs/STATUS.md → Deferred Features` for activation instructions.

When approved, tasks will include:

### Task 10.1 — Real LLM client
**File:** `backend/ai/services/llm_client.py`

Reads `ai.llm_endpoint`, `ai.llm_api_key`, `ai.llm_model` from system_config. OpenAI-compatible HTTP call.

### Task 10.2 — Rate limiting + logging
- Per-user rate limit via cache counter vs `ai.rate_limit_per_hour` config (see `docs/CONFIG.md`)
- Log each `AIRequest` with token count

### Task 10.3 — Context loaders
**File:** `backend/ai/services/context_loader.py`

- `learn_assistant`: lesson `content_md` + course context (**never include flag values**)
- `editor_assistant`: lesson draft context for Editors
- `learning_path`: user progress → suggest next content

### Task 10.4 — Frontend: AI chat panel
**File:** `frontend/src/components/AIChatPanel/index.tsx`

Floating slide-in panel in lesson/challenge pages. Mode selector, textarea input, markdown response display, usage indicator.

**Activation checklist (when approved):**
1. Uncomment `'ai'` in `settings.py` `INSTALLED_APPS`
2. Uncomment AI URL in `backend/backend/urls.py`
3. Add `ai.*` keys to `seed_config` command (see `docs/CONFIG.md` for canonical names)
4. Run `python manage.py makemigrations ai && python manage.py migrate`

---

## Slice 11 — Statistics

### Task 11.1 — Leaderboard API
```
GET /api/leaderboard/?type=overall|challenge|quiz|course&page=1
→ [{rank, user: {id, username, avatar}, score, delta}]
```

### Task 11.2 — Admin stats API
```
GET /api/admin/stats/              → overview: user_count, active_today, solves_week
GET /api/admin/stats/users/{id}/   → detailed user stats
```

### Task 11.3 — Frontend: Leaderboard
```
app/(app)/leaderboard/page.tsx → tab switcher + rank table with avatar
```

### Task 11.4 — Frontend: Admin stats dashboard
```
admin/stats/page.tsx → summary cards + user detail lookup
```

---

## Critical Files Reference

| Area | File | Action |
|------|------|--------|
| Settings | `backend/backend/settings.py` | AUTH_USER_MODEL, INSTALLED_APPS, Channels config |
| Root URLs | `backend/backend/urls.py` | include all app URLs |
| ASGI | `backend/backend/asgi.py` | Channels WebSocket routing |
| Domain models | `backend/api/models.py` | add User model; verify vs dbv3.sql |
| Auth app | `backend/auth_app/` | create new Django app |
| API views | `backend/api/views/` | split by domain (course.py, challenge.py, quiz.py, …) |
| API serializers | `backend/api/serializers/` | split by domain |
| API URLs | `backend/api/urls.py` | create, include into root |
| WS consumers | `backend/realtime/consumers/` | quiz_consumer.py, notification_consumer.py |
| Frontend | `frontend/src/` | full directory structure |

## Reusable Patterns

- **Tree CRUD:** `filter(parent_id=X)` for lazy loading; `path__startswith` + `bulk_update` on move → same logic for Course/Challenge/Quiz
- **FullAudit:** all domain models inherit → audit fields auto-populated
- **TextChoices:** enums already in `models.py` → reuse in serializers
- **Service layer:** `<app>/services/` pattern — see `auth_app/services/` once created
- **`get_config(key)`:** util in `api/utils.py` → single way to read `system_config`

## Verification Checklist

| Slice | Verification |
|-------|-------------|
| 0 | `migrate` runs clean; `seed_config` creates default rows |
| 1 | `POST /api/auth/login/` → JWT with `permissions: []`; `POST /api/auth/token/refresh/` works |
| 2 | Role → permission → user → login → JWT contains permission key |
| 3 | `GET /api/config/` returns grouped configs; secrets show `***` |
| 4 | Next.js builds; `/login` renders; auth store hydrates from localStorage |
| 5 | Create course → nodes → lesson → `GET /api/courses/{slug}/progress/` returns data |
| 6 | Submit correct flag → `{correct: true}` + progress updated |
| 7 | WS connect → answer all questions → `UserQuizProgress` updated |
| 8 | `GET /api/users/me/` returns stats; `PUT` updates display_name |
| 9 | Complete challenge → notification in bell within 2s (WS delivery) |
| 10 | ⚠️ DEFERRED — `POST /api/ai/ask/` → real LLM response |
| 11 | `GET /api/leaderboard/` → sorted list with correct scores |
