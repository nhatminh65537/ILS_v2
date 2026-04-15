# DECISIONS.md — ILS v2 Design Decisions & Open Questions

> Living document. Track every decision that shapes implementation.
> **OPEN** = needs human decision before coding can begin.
> **RESOLVED** = decision made; implementation must follow it.
>
> Last updated: 2026-04-01

---

## How to Use

1. Before starting a slice, find all open questions tagged `[SLICE-N]` and resolve them.
2. When a decision is made, change status from OPEN → RESOLVED and fill in "Decision".
3. Update `docs/IMPL_PLAN.md` slice header to mark questions resolved.
4. If implementation deviates from a resolved decision, update this document and IMPL_PLAN.

---

## Index of Open Questions

| ID | Topic | Blocks | Status |
|----|-------|--------|--------|
| [Q-INFRA-01](#q-infra-01-frontend-source-directory) | Frontend src/ directory layout | Slice 1 (Task 1.5), Slice 4–11 | **RESOLVED** (Option A) |
| [Q-SLICE1-01](#q-slice1-01-member-role-seeding) | Member role seeding at bootstrap | Slice 1 (Task 1.1, 0.3) | **RESOLVED** (Option A) |
| [Q-AUTH-04](#q-auth-04-jwt-token-expiry-and-refresh-strategy) | JWT token expiry + refresh window | Slice 1 (Tasks 1.2, 1.5) | **RESOLVED** (Option A) |
| [Q-AUTH-05](#q-auth-05-first-login-admin-ceremony) | First-login admin credential ceremony | Slice 0 (Task 0.4 new), Slice 1 | **RESOLVED** (Option C) |
| [Q-INFRA-02](#q-infra-02-api-url-prefix-convention) | API URL prefix convention | Slice 1–11 | **RESOLVED** |
| [Q-INFRA-03](#q-infra-03-email-backend-for-password-reset) | Email backend for password reset | Slice 1 | **RESOLVED** |
| [Q-INFRA-04](#q-infra-04-cache-backend-for-rate-limiting) | Cache backend for rate limiting | Slice 1 | **RESOLVED** |
| [Q-INFRA-05](#q-infra-05-websocket-jwt-auth-method) | WebSocket JWT auth method | Slice 7 | **RESOLVED** (Option B) |
| [Q-INFRA-06](#q-infra-06-client-side-token-storage) | Client-side token storage | Slice 1, 4 | **RESOLVED** |
| [Q-INFRA-07](#q-infra-07-i18n-language-strategy) | i18n language and timing | Slice 4 | **RESOLVED** (Option C) |
| [Q-INFRA-08](#q-infra-08-frontend-ui-component-library) | Frontend UI component library | Slice 4 | **RESOLVED** (Option A) |
| [Q-AUTH-01](#q-auth-01-default-role-for-new-users) | Default role for newly registered users | Slice 1–2 | **RESOLVED** |
| [Q-AUTH-02](#q-auth-02-first-admin-creation-mechanism) | First admin account creation | Slice 0–1 | **RESOLVED** → [R-AUTH-11](#r-auth-11-first-admin-bootstrap-via-seed_admin) |
| [Q-AUTH-03](#q-auth-03-sso-only-lockout-fallback) | SSO-only lockout fallback | Slice 1 | **RESOLVED** |
| [Q-AUTH-06](#q-auth-06-sso-account-linking-strategy) | SSO account linking: merge or separate | Slice 1 (Task 1.3) | **RESOLVED** (Option A) |
| [Q-AUTH-07](#q-auth-07-device-logout-granularity) | Device logout: one session or all | Slice 1 (Task 1.4 deferred) | **RESOLVED** (Option A) |
| [Q-INFRA-09](#q-infra-09-cors-and-domain-configuration) | CORS policy + frontend/backend domain | Slice 1 (Task 1.5), Slice 4 | **RESOLVED** (Option A) |
| [Q-INFRA-10](#q-infra-10-frontend-useradmin-surface-separation) | Frontend user/admin surface separation | Slice 4+, Slice 8 admin FE | **RESOLVED** (Option A) |
| [Q-ARCH-01](#q-arch-01-max-permissions-bitmap-capacity) | Max permissions bitmap encode size | Slice 2 (permission design) | **RESOLVED** (Option B) |
| [Q-CONFIG-01](#q-config-01-default-systemconfig-auth-values) | Default auth.* system_config values at seed | Slice 0, 1 | **OPEN** |
| [Q-LEARN-01](#q-learn-01-lesson-node-creation-atomicity) | Lesson node creation: 1-step or 2-step | Slice 5 | **RESOLVED** (Option A) |
| [Q-LEARN-02](#q-learn-02-mini-quiz-question-source) | Mini-quiz question source | Slice 5 | **RESOLVED** (Option A) |
| [Q-LEARN-03](#q-learn-03-course-progress-on-structure-change) | Course progress when structure changes | Slice 5 | **RESOLVED** (Option D) |
| [Q-LEARN-04](#q-learn-04-course-delete-strategy) | Course delete: soft-delete or archive | Slice 5 | **RESOLVED** (Option E) |
| [Q-LEARN-05](#q-learn-05-slug-conflict-resolution) | Slug conflict resolution | Slice 5 | **RESOLVED** (Option D) |
| [Q-LEARN-06](#q-learn-06-outline-url-frontend-exposure) | Outline URL config: backend-only or public | Slice 5 | **RESOLVED** (Option D) |
| [Q-LEARN-07](#q-learn-07-tag-creation-permissions) | Who can create course tags | Slice 5 | **RESOLVED** (Option D) |
| [Q-LEARN-08](#q-learn-08-lesson-completion-trigger) | Lesson completion trigger (scroll enforcement) | Slice 5 | **RESOLVED** (Option D) |
| [Q-LEARN-09](#q-learn-09-lesson-start-trigger) | Lesson start: implicit or explicit | Slice 5 | **RESOLVED** (Option B) |
| [Q-LEARN-10](#q-learn-10-outline-sync-failure-handling) | Outline sync failure / timeout behavior | Slice 5 | **REVISED** (Option A — sync blocking MVP) |
| [Q-CHALL-01](#q-chall-01-challenge-instance-scope) | Challenge instances in MVP or deferred | Slice 6 | **RESOLVED** (Option C) |
| [Q-CHALL-02](#q-chall-02-instance-deployment-protocol) | Instance deployment external system spec | Slice 6 | **RESOLVED** → [R-ARCH-12](#r-arch-12-instance-deployment--strategy-pattern) |

---

### Q-AUTH-06: SSO Account Linking Strategy

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.3 — SSO callback flow)

**Problem:**
When a user registers via SSO (Authentik), how does the system handle existing local accounts?
- Option A: One User can have multiple UserIdentity entries (link SSO to existing local account)
- Option B: SSO-only identity (separate User per auth method, no linking)

**Impact:** Affects UserIdentity schema, Task 1.1 + 1.3 logic, and UX.

**Options:**
| Option | Flow | Pros | Cons |
|--------|------|------|------|
| A | Allow linking | User can use either auth method on same account | Complex linking UX, multiple UserIdentity per User |
| B | Separate by identity | Simpler logic, cleaner schema | User must choose one auth method, or get duplicate accounts |

**Decision:** Choose Option A. Add an idempotent `seed_roles` bootstrap command (Task 0.3.5) so Member role exists before registration starts.

---

### Q-AUTH-07: Device Logout Granularity

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.4 deferred — session management, revisit when implementing)

**Problem:**
Task 1.4 deferred password reset but session management still needs clarity:
- GET `/api/auth/sessions/` lists active sessions
- DELETE `/api/auth/sessions/{id}/` revokes one session
- **Missing:** "Logout all devices" endpoint?

**Options:**
| Option | Features | Pros | Cons |
|--------|----------|------|------|
| A | Revoke one session only | Granular control | User must click each device |
| B | Add "logout all" endpoint | Common UX pattern, password-reset-triggered logout | Extra endpoint |
| C | Both A and B | Complete control | Scope creep for Task 1.4 |

**Decision:** Choose Option C. Both single-session revoke (`DELETE /api/auth/sessions/{id}/`) and logout-all (`POST /api/auth/logout-all/`) endpoints are implemented. This gives users granular per-device control while also supporting full session purge (e.g. on password change or security incident).

---

### Q-INFRA-09: CORS and Domain Configuration

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.5 frontend API calls)

**Problem:**
Memory-only token storage requires frontend to call `/api/auth/token/refresh/` endpoint. CORS policy depends on deployment:
- **Same domain:** Frontend and Django on same origin → CORS not needed, set `SameSite=Lax` on any cookies
- **Different domain:** Frontend and Django on different origins → CORS required, JS credentials in requests

**Decision needed:** Assume same domain in production, or allow cross-origin?

**Options:**
| Option | Deployment | CORS | Frontend credentials | Notes |
|--------|------------|------|----------------------|-------|
| A | Same domain (e.g., app.example.com → both served) | No | Not needed | Simpler, common for internal tools |
| B | Different domains (e.g., app.example.com vs api.example.com) | Yes | `credentials: 'include'` on fetch | More flexible, requires CORS setup |

**Decision:** Choose Option A. Assume same-domain deployment by default, so CORS is not required for Slice 1.

---

### Q-INFRA-10: Frontend User/Admin Surface Separation

**Status:** RESOLVED
**Blocks:** Slice 4+ frontend architecture consistency and admin UI evolution

**Problem:**
Frontend admin pages were previously delivered under the same surface as user pages, without a dedicated entrypoint and without an independent layout shell. The team requires:
- Dedicated admin login flow
- No admin registration flow
- Route-level split now, while keeping development access under `/{locale}/admin/*`
- Vhost/domain split deferred to deployment phase

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Route-group split in one Next.js app: user surface + admin surface, admin login at `/{locale}/admin/login`, no admin register | Low migration risk now, preserves dev URL contract, ready for later vhost split | Requires additional shell/layout refactor work |
| B | Immediate split into two independent frontend projects | Strong isolation from day one | Higher migration cost and duplicated runtime setup |
| C | Keep a single surface and only style pages | Minimal short-term work | Keeps coupling and blocks clean future admin vhost rollout |

**Decision:** Choose Option A.

**Implementation constraints from decision:**
- Keep development/admin access paths under `/{locale}/admin/*`.
- Admin authentication entry is `/{locale}/admin/login`.
- Admin registration page is intentionally absent.
- User and admin surfaces must use independent layout wrappers (navbar/sidebar/content/footer).
- Vhost mapping is deferred to deployment (Phase C), not implemented in current coding phase.

---

### Q-ARCH-01: Max Permissions Bitmap Capacity

**Status:** RESOLVED
**Blocks:** Slice 2 (authorization design, but informs Slice 1 JWT structure)

**Problem:**
Permissions use base64-encoded bitmap in JWT token. Current decision: text-encoded, no size limit enforced. But:
- Too many permissions → large JWT payload → slow requests
- Need explicit cap for design clarity

**Options:**
| Option | Max Permissions | Encoding | Notes |
|--------|-----------------|----------|-------|
| A | Unlimited (text base64) | Base64("perm1,perm2,...") | Simple, but no bound check |
| B | 256 (1 byte bitmap) | Base64(byte[32]) | Tight packing, but need explicit bit mapping |
| C | 512 (2 byte bitmap) | Base64(byte[64]) | More room, still compact |
| D | 1024 (4 byte bitmap) | Base64(byte[128]) | Very flexible, payload larger |

**Decision:** Choose Option B. Set max permissions to 256 bits (32-byte bitmap, base64 encoded).

---

### Q-CONFIG-01: Default System Config Auth Values at Seed

**Status:** OPEN
**Blocks:** Slice 0 (Task 0.3 — seed_config completion) and Slice 1 (default auth behavior)

**Problem:**
Task 0.3 seeds 42 canonical keys from CONFIG.md. Current defaults:
- `auth.local_login_enabled = true` 
- `auth.sso_enabled = false`
- `auth.authorization_enabled = true`

**Question:** Are these defaults right for first-time deployment? For example:
- Should SSO be pre-enabled if Authentik not yet configured (would break login)?
- Should AuthZ be `false` by default in dev (as per R-DEV-01 bypass policy)?

**Decision needed:** Confirm or adjust 3 auth.* seed values.

**Options:**
| Option | local_login | sso_enabled | authz_enabled | Rationale |
|--------|-------------|------------|---------------|----------|
| A (current) | true | false | true | Native login works out of box; SSO opt-in; RBAC enforced |
| B (dev-friendly) | true | false | **false** | Unblock feature dev without RBAC complexity |
| C (production-ready) | **true** | **true** | true | Assume Authentik will be configured; allow fallback |

**Decision:** _(not yet made)_

---

## CRITICAL Block Issues (Discovered 2026-03-24)

These 4 questions emerged during Slice 1 planning and must be resolved BEFORE Task implementation begins:

---

### Q-SLICE1-01: Member Role Seeding

**Status:** RESOLVED
**Blocks:** Slice 0 (Task 0.3 update) and Slice 1 (Task 1.1 register flow)

**Problem:**
Q-AUTH-01 resolves to auto-assign "Member" role on user registration. However, the Member role must exist in the database before registration can succeed. Currently:
- Task 0.3 (`seed_config`) is complete and creates 42 system_config keys
- There is NO `seed_roles` command to create Admin/Editor/Member roles
- Task 1.1 (register endpoint) will fail with FK constraint violation if Member role missing

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Add `seed_roles` command to Slice 0 (Task 0.3.5) | One-shot setup, idempotent | Extra work in foundation |
| B | Auto-create Member role in Task 1.1 if missing | Defers to implementation time | Less explicit, harder to test in isolation |
| C | Require manual `manage.py seed_roles` before testing | Minimal scope | Extra step, easy to forget |

**Decision:** Choose Option A. Add an idempotent `seed_roles` bootstrap command (Task 0.3.5) so Member role exists before registration starts.

---

### Q-AUTH-04: JWT Token Expiry and Refresh Strategy

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.2 JWT logic, Task 1.5 frontend refresh flow)

**Problem:**
Q-INFRA-06 chose memory-only token storage + refresh endpoint. Requires explicit decision on:
1. **Access token lifespan:** How long before token expires? (affects refresh frequency)
2. **Refresh token lifespan:** How long until user must re-login? (affects security expiry)
3. **Refresh window:** Auto-refresh on 401, or user-triggered?

**Options:**
| Option | Access | Refresh | Auto-refresh? | Trade-off |
|--------|--------|---------|---------------|----------|
| A | 15 min | 7 days | Yes (silent) | Current token always fresh, user "never" logs out (7 days) |
| B | 1 hour | 7 days | Yes (silent) | Less refresh calls, but UX stale if not used for hour |
| C | 1 hour | 24 hours | Manual (on 401 redirect) | Simple, forces explicit refresh, shorter session |

**Decision:** Choose Option A. Use 15-minute access tokens, 7-day refresh tokens, and silent refresh behavior when access token expires.

---

### Q-AUTH-05: First-Login Admin Ceremony

**Status:** RESOLVED
**Blocks:** Slice 0 (new Task 0.4 — admin bootstrap UX) and Slice 1

**Problem:**
R-AUTH-11 defines `seed_admin` command to create first admin. However, **what password/credential does this admin use on first login?** Current state:
- `seed_admin` creates a User with email/username but **no explicit password mechanism documented**
- Need decision: how does first admin log in initially?

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Create random password, force reset on first login | Secure by default | Extra UX step, password complexity unknown |
| B | Create with empty/null password, SSO-only admin | Assumes SSO available | Not suitable if Authentik not ready |
| C | Seed with default password (e.g., "changeme123"), must reset | Simple, testable | Security risk if seed not removed, weak default |
| D | Generate 1-time token, send via email, click to set password | Best UX | Requires email working, extra complexity |

**Decision:** Choose Option C for implementation speed: `seed_admin` uses a temporary default password (for example `changeme123`) and requires immediate password reset on first login.

---

### Q-INFRA-01: Frontend Source Directory (ESCALATED)

**Status:** RESOLVED (escalation closed)
**Blocks:** Slice 1 (Task 1.5 — frontend auth pages), then Slice 4–11

**Problem:**
Task 1.5 references `frontend/src/app/`, `frontend/src/components/`, `frontend/src/store/` but current frontend has code at `frontend/app/` (Next.js 16 default). Decision is required to unblock Task 1.5 file creation.

**Options:**
| Option | Layout | Action | Effort |
|--------|--------|--------|--------|
| A | Keep `frontend/app/` | Update all IMPL_PLAN references from `src/` to no `src/` | ~30 min |
| B | Migrate to `frontend/src/app/` | Move files, update tsconfig.json paths, IMPL_PLAN already correct | ~1 hour |

**Recommendation:** Decide TODAY to avoid re-do.

**Decision:** Choose Option A. Keep Next.js default `frontend/app/` layout and align implementation plan paths that still point to `frontend/src/`.

**Impact on IMPL_PLAN:** Slice 4, 5, 6, 7, 8, 9, 10, 11 all reference `frontend/src/` — these paths refer to `frontend/src/components/`, `frontend/src/stores/`, etc. (not the app router). The app router itself stays at `frontend/app/`.

---

## OPEN Questions

---

### Q-INFRA-02: API URL Prefix Convention

**Status:** RESOLVED
**Blocks:** All API slices (Slice 1–11)

**Problem:**
Historical conflict (now resolved and already synchronized in docs):
- PRD endpoints used namespaced routes (`/api/learn/*`)
- Older implementation-plan drafts used flat routes (`/api/courses/*`, `/api/lessons/*`)

The same conflict may exist for challenges and quiz PRDs. A consistent scheme must be chosen before any URL routing is implemented.

**Options:**
| Option | Example URL | Pros | Cons |
|--------|-------------|------|------|
| A | `/api/courses/` (IMPL_PLAN) | Shorter URLs; standard REST convention | No namespace; may clash if names overlap across domains |
| B | `/api/learn/courses/` (PRD) | Clear namespacing per domain | Slightly longer; extra URL nesting |

**Sub-questions:**
- Should auth endpoints be `/api/auth/` (IMPL_PLAN) or `/auth/`?
- Should admin-only endpoints be nested under `/api/admin/` or use permissions at the same path?

**Decision:** Choose namespaced API paths by domain (Option B pattern). Apply `/api/auth/*` for auth endpoints and use domain namespaces for feature routes (for example `/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`).

---

### Q-INFRA-03: Email Backend for Password Reset

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.4 — password reset flow)

**Problem:**
The password reset flow sends an HMAC-signed link via email (1-hour expiry). No email backend is configured. This requires either a real SMTP setup or a decision to defer.

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Django SMTP email backend | Works in production | Requires SMTP server/credentials |
| B | Console backend (dev only) | Zero config; email prints to console | Not usable for real users |
| C | Defer password reset to later slice | Unblocks Slice 1 core | Users can't self-reset; only admin resets |

**Sub-questions:**
- Should SMTP credentials be stored in `system_config` or `.env`/`settings.py`?  
  (Current CONFIG.md does not list any `email.*` keys.)
- Is email-based reset required for initial launch?

**Decision:** Choose Option C for current phase: defer password reset email flow (Task 1.4) to a follow-up session so Slice 1 core auth can proceed. SMTP configuration decision is postponed with Task 1.4.

---

### Q-INFRA-04: Cache Backend for Rate Limiting

**Status:** RESOLVED
**Blocks:** Slice 1 (Task 1.1 — login rate limiting)

**Problem:**
Login rate limiting uses `cache.get/set`. Django's default `LocMemCache` is per-process and not shared between workers (Daphne runs multiple threads). For correct rate limiting, a shared cache is needed.

**Options:**
| Option | Backend | Pros | Cons |
|--------|---------|------|------|
| A | LocMemCache (default) | Zero config | Rate limit not accurate with multiple workers |
| B | Redis via `django-redis` | Accurate, production-grade | Requires Redis service; additional dependency |
| C | Database cache (`DatabaseCache`) | No extra service | Slow; adds DB load |

**Sub-questions:**
- Is Redis required from the start or only needed for production?
- If Redis: add `django-redis` to `requirements.txt` and configure in `settings.py`?

**Decision:** Use LocMemCache for development now, with explicit limitation note (per-process counters). Require Redis-backed cache for production deployment to ensure accurate distributed rate limiting.

---

### Q-INFRA-05: WebSocket JWT Auth Method

**Status:** RESOLVED
**Blocks:** Slice 7 (Task 7.3 — Quiz WebSocket consumer)

**Problem:**
IMPL_PLAN says: `ws://host/ws/quiz/{quiz_id}/?token={jwt}` — JWT in query string.

**Security concern:** JWT tokens in query strings appear in server access logs, browser history, and HTTP referrer headers. This is a known risk for long-lived tokens.

**Options:**
| Option | Method | Pros | Cons |
|--------|--------|------|------|
| A | Query string (`?token=`) | Simple client implementation | Token leaks in logs/history |
| B | First WebSocket message `{type: "auth", token: "..."}` | Token not in URL | Slightly more complex consumer `connect()` logic |
| C | Cookie (httpOnly, short-lived) | Most secure | Complex CORS/same-origin setup for WS |

**Decision:** Choose Option B. WebSocket auth uses the first message pattern: client connects without JWT in URL, then must send `{type: "auth", token: "<access_jwt>"}` within an auth timeout window. If auth fails or times out, server closes the socket.

---

### Q-INFRA-06: Client-Side Token Storage

**Status:** RESOLVED
**Blocks:** Slice 1 (frontend), Slice 4 (auth store)

**Problem:**
JWT access and refresh tokens need to be stored somewhere on the client. Each storage location has security trade-offs.

**Options:**
| Option | Storage | XSS Protection | CSRF Protection | Notes |
|--------|---------|---------------|-----------------|-------|
| A | `localStorage` | ❌ Vulnerable | ✅ Not needed | Simple; token survives page reload |
| B | `sessionStorage` | ❌ Vulnerable | ✅ Not needed | Clears on tab close |
| C | `httpOnly` cookies | ✅ Protected | ❌ Need CSRF token | Requires backend to set cookies; more complex |
| D | Memory only (Zustand, no persist) | ✅ Protected | ✅ Not needed | Token lost on page reload; needs silent refresh |

**Sub-questions:**
- Is XSS protection a priority given the platform is internal-only (~100 users)?
- If cookies: does the Next.js frontend and Django backend share the same domain in production (affecting cookie setup)?

**Decision:** Choose `localStorage` persistence (Option A) via Zustand persist middleware. Keep access/refresh token synchronization in one auth store and retain refresh-on-401 flow through Axios interceptors.

---

### Q-INFRA-07: i18n Language Strategy

**Status:** RESOLVED
**Blocks:** Slice 4 (Frontend Foundation — next-intl setup)

**Problem:**
IMPL_PLAN mentions both `en.json` and `vi.json`. `next-intl` is already installed. No decision on default language, language switching UI, or whether i18n should be done from the start or layered in later.

**Options:**
| Option | Approach |
|--------|----------|
| A | i18n from day one — all UI text goes into locale files from Slice 4 |
| B | Hardcode English first; add i18n wrapper later (after all features done) |
| C | Vietnamese-first (platform is for a Vietnamese org); English as secondary |

**Sub-question:** Should the language toggle be user-profile-persistent or browser-local?

**Decision:** Choose Option C with Option A execution style: Vietnamese-first (`defaultLocale='vi'`) and English secondary (`'en'`), with i18n integrated from Slice 4 day one. All UI text must come from locale dictionaries.

---

### Q-INFRA-08: Frontend UI Component Library

**Status:** RESOLVED
**Blocks:** Slice 4 (shared UI components — Button, Input, Modal, Badge, etc.)

**Problem:**
`docs/IMPL_PLAN.md` refers to `components/ui/` components but doesn't specify whether to use an existing component library or build from scratch.

**Options:**
| Option | Library | Pros | Cons |
|--------|---------|------|------|
| A | `shadcn/ui` | Well-designed; Tailwind v4 compatible; copy-paste components | Requires CLI setup |
| B | `Headless UI` (Tailwind Labs) | Unstyled; full control | More boilerplate per component |
| C | Custom built | Maximum control | More time; less tested |
| D | `Radix UI` primitives directly | Layered approach; same base as shadcn | More manual work |

**Sub-question:** Are there specific design mockups in `design/ui/` that should drive the component choices?

**Decision:** Choose Option A (`shadcn/ui`) on top of Tailwind v4 and existing preset (`radix-lyra`, zinc). Use generated primitives under `frontend/src/components/ui/`.

---

## Slice 4 Implementation Decisions (2026-03-31)

- **DEC-001**: MSW mock data stays in-memory only; no localStorage persistence for fixtures.
- **DEC-002**: Auth tokens are persisted in localStorage via Zustand persist middleware.
- **DEC-003**: Frontend API base URL is `http://localhost:8000` through `NEXT_PUBLIC_API_URL`.
- **DEC-004**: MSW is enabled by default in development with `NEXT_PUBLIC_ENABLE_MSW=true`.
- **DEC-005**: No standalone `translate()` helper; use `getTranslations` / `useTranslations` from next-intl.

---

### Q-AUTH-01: Default Role for Newly Registered Users

**Status:** RESOLVED
**Blocks:** Slice 1 (register) and Slice 2 (RBAC system)

**Problem:**
When a user self-registers (native login), what permissions should they have immediately?  
The RBAC system requires roles to be assigned; no code specifies what role new registrations get.

**Options:**
| Option | Behavior |
|--------|----------|
| A | No role assigned; zero permissions until an Admin promotes them | Secure but users see an empty dashboard |
| B | Auto-assign a default "Member" role with read permissions | Smooth UX; requires a seed "Member" role |
| C | Auto-assign "Member" role only if `auth.auto_member_role=true` (system_config) | Configurable; more complex |

**Sub-question:** Should there be a seed command or migration that creates default roles (Member, Editor)?

**Decision:** Choose Option B: auto-assign default Member role on successful registration.

---

### Q-AUTH-02: First Admin Account Creation

**Status:** RESOLVED
**Blocks:** Slice 0 (foundation) and Slice 1 (auth)

**Problem:**
After running migrations and `seed_config`, there is no admin user. `createsuperuser` creates a Django superuser but does not assign any ILS RBAC roles.

**Options:**
| Option | Approach |
|--------|----------|
| A | Use Django's `createsuperuser` + manual role assignment via shell | Simple; no extra code |
| B | Create a custom `seed_admin` management command | One-command setup; repeatable |
| C | Add first-run setup wizard (frontend page if no users exist) | Best UX; significant extra scope |

**Sub-question:** Should `is_superuser=True` Django users bypass all RBAC checks automatically?

**Decision:** Choose **Option B**. Implement `seed_admin` management command as the canonical first-admin bootstrap flow.

---

### R-AUTH-11: First Admin Bootstrap via `seed_admin`

**Decision date:** 2026-03-17
**Source:** Session decision, `docs/IMPL_PLAN.md` Slice 0 prerequisites

Use `python manage.py seed_admin` as the standard first-admin setup path.
- Command must be idempotent (safe to re-run).
- Command creates initial admin user if missing, or updates existing user flags if present.
- Keep Django `createsuperuser` available as fallback tooling, but not the documented default bootstrap path.
- During bootstrap and early setup, `is_superuser=True` users may bypass RBAC checks.

---

### Q-AUTH-03: SSO-Only Lockout Fallback

**Status:** RESOLVED
**Blocks:** Slice 1 (SSO setup), Slice 3 (system config)

**Problem:**
If an admin sets `auth.local_login_enabled=false` and `auth.sso_enabled=true`, but Authentik goes offline, all users are locked out. There is no documented fallback.

**Options:**
| Option | Approach |
|--------|----------|
| A | No fallback; accept the risk (admin must fix Authentik first) | Simple; no extra code |
| B | Emergency local login bypass via settings.py flag (not in system_config) | Harder to accidentally enable; requires server access |
| C | Always allow local login for `is_superuser=True` users regardless of system_config | Small scope; superusers can always get in |

**Decision:** Choose Option C: always allow local login for `is_superuser=True` as an emergency fallback when SSO-only setup is unavailable.

---

### Q-LEARN-01: Lesson Node Creation Atomicity

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.2 — CourseNode tree API, Task 5.3 — Lesson CRUD)

**Problem:**
The PRD says: _"Create a lesson node: create `lesson` + `course_node` with `is_item=True`"_ — implied to be one atomic operation.  
Older drafts used separate operations: create node and create lesson in different calls.

Two possible flows:

**Option A — One-step (atomic):**
```
POST /api/learn/courses/{slug}/nodes/
Body: { is_item: true, lesson_type: "markdown", title: "...", parent_id: 5, position: 2 }
→ Server creates lesson + course_node in one DB transaction
→ Returns: { node: {...}, lesson: {...} }
```

**Option B — Two-step:**
```
1. POST /api/learn/lessons/    → creates lesson; returns lesson.id
2. POST /api/learn/courses/{slug}/nodes/
   Body: { is_item: true, lesson_id: 42, parent_id: 5, position: 2 }
→ Node references existing lesson
```

**Pros/Cons:**
| | Option A | Option B |
|--|---------|---------|
| API calls | 1 | 2 |
| Orphan risk | None (atomic) | Possible orphan lessons if step 2 fails |
| Flexibility | Less flexible (lesson always tied to a node) | Can create lesson drafts independent of tree |
| Simplicity | Simpler for frontend | More control; needed if same lesson appears in multiple nodes? |

**Sub-question:** Can the same `lesson` record appear in multiple `course_node` records, or is it always 1:1?  
(Confirmed 1:1 — `DATA_MODEL.md` §3.4 defines `course_node.lesson_id` as `UNIQUE nullable FK`. One lesson per node at most.)

**Decision:** Choose Option A (atomic one-step creation). Backend creates lesson + course_node in one transaction to eliminate orphan lessons and simplify frontend flow.

**Contract note (MVP):** `POST /api/learn/lessons/` is not a primary creation path in the target Slice 5 contract. Lesson creation for course tree items must go through `POST /api/learn/courses/{slug}/nodes/` with `is_item=true`.

---

### Q-LEARN-02: Mini-Quiz Question Source

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.3 — Lesson CRUD) and Slice 7 (Quiz)

**Problem:**
The `lesson_question` table links lessons to questions via `question_id`. This appears to reference `quiz_question`. The relationship between mini-quiz questions (embedded in lessons) and full quiz questions (standalone Quiz feature) is not documented.

**Options:**
| Option | Approach |
|--------|----------|
| A | `lesson_question.question_id` → `quiz_question` (same table) | Reuse existing question bank; no duplication; but tightly couples Learn and Quiz |
| B | Create a separate `lesson_question_item` table for mini-quiz questions | Fully decoupled; but duplicates question format |
| C | Same table as A, but lesson mini-quiz questions have a flag (`is_standalone=False`) | Middle ground |

**Sub-question:** Can an Editor add any `quiz_question` to a lesson, or only questions they created? Is there an ownership/permission model for quiz questions used in lessons?

**Decision:** Choose Option A. Mini-quiz questions reuse `quiz_question` through `lesson_question` mapping.

---

### Q-LEARN-03: Course Progress on Structure Change

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.4 — progress tracking)

**Problem:**
When new lessons are added to a published course, or existing lessons are deleted, existing `user_course_progress` records have an incorrect picture of progress (the denominator changes).

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Total calculated dynamically at query time | Always accurate | Extra JOIN on every progress query |
| B | Snapshot total at start of course (creation of user_course_progress) | Fast reads | Stale on structure change |
| C | Signal on structure change → bulk update all affected user_course_progress totals | Accurate + fast reads | Complex signal logic |
| D | Versioned lazy recompute per user | Avoids global bulk recalculation; accurate when read | Requires version fields + cache invalidation per user-course |

**Sub-question:** Should modifying a published course's structure be restricted (prompt to un-publish first)?

**Decision:** Choose Option D. Use `course.structure_version` with per-user lazy recompute (`last_computed_version`) to avoid heavy global recalculation while keeping progress accurate.

---

### Q-LEARN-04: Course Delete Strategy

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.1 — Course CRUD)

**Problem:**
PRD says: _"Soft-delete or archive"_ without choosing. The codebase has `SoftDeleteAudit` model (adds `deleted_at`) AND a `status` field with `archived` value. These are two different mechanisms.

**Options:**
| Option | Mechanism | Behavior |
|--------|-----------|----------|
| A | Archive only (`status=archived`) | Course stays visible to admins/editors; no physical deletion |
| B | Soft delete (`SoftDeleteAudit.deleted_at`) | Course hidden from all queries by default; recoverable |
| C | Hard delete | Course + nodes + lessons permanently removed; no recovery |
| D | Archive first, then hard delete (two-step) | Safe but complex |
| E | Hybrid archive + soft-delete path | Archive for normal ops; soft-delete/purge for irreversible admin cleanup |

**Sub-question:** Should deleting a course cascade delete all nodes, lessons, and user progress records? Or should progress be preserved for historical data?

**Decision:** Choose Option E. Use hybrid behavior: archive for normal product flow, and restricted soft-delete/purge path for irreversible cleanup operations.

---

### Q-LEARN-05: Slug Conflict Resolution

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.1 — Course CRUD)

**Problem:**
Slugs are auto-generated from `title`. If two courses have the same or similar titles, the auto-generated slugs will conflict. Resolution strategy not documented.

**Options:**
| Option | Strategy | Example |
|--------|----------|---------|
| A | Append incrementing number | `web-security`, `web-security-2`, `web-security-3` |
| B | Append random suffix | `web-security-a3f1` |
| C | Fail and ask editor to modify title | Return 400 "Slug already exists" |
| D | Allow editor to manually set slug | Editor specifies custom slug; auto-generate as default |

**Sub-question:** Is the slug immutable after creation? (Changing it breaks any external URLs pointing to the course.)

**Decision:** Choose Option D with server-assisted validation: editor controls slug, API enforces uniqueness and returns suggestions on conflict (409).

---

### Q-LEARN-06: Outline URL Frontend Exposure

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.3 — Lesson CRUD, Outline integration)

**Problem:**
PRD says: _"Learning-content URLs in content use the Outline base URL from system_config (no hardcoding)"_  
`system_config[outline.url]` contains the base URL of the Outline server.

Frontend needs the Outline base URL to render links inside lesson content. But `outline.api_token` is secret.

**Options:**
| Option | Approach |
|--------|----------|
| A | `outline.url` is public (non-secret config); frontend fetches it via `/api/config/outline.url/` | Simple; URL exposed to all authenticated users |
| B | Backend rewrites Outline URLs in content before serving to frontend | Zero exposure; but complex content transformation |
| C | Add a dedicated `/api/config/public/` endpoint that returns only non-secret config values | Clean separation; reusable for other public configs |
| D | Backend-only integration (server-mediated content fetch) + manual secret visibility permission for admin tooling | Keeps member clients simple and avoids direct Outline dependency in FE |

**Decision:** Choose Option D. Frontend does not call Outline directly; backend fetches and normalizes lesson content. Secret config visibility is controlled by a manual seeded permission (`system.config.view_secret`) for privileged users.

---

### Q-LEARN-07: Tag Creation Permissions

**Status:** RESOLVED
**Blocks:** Slice 5 (FR-LEARN-02 — Category & Tag Management)

**Problem:**
PRD specifies CRUD for `course_tag` but does not define which role can create/delete tags.

**Options:**
| Option | Who can create tags |
|--------|---------------------|
| A | Admin only | Controlled vocabulary; editors can only use existing tags |
| B | Editor and Admin | Flexible; editors can create tags for their content |
| C | Any authenticated user | Most flexible; risks tag sprawl |
| D | Permission-based (explicit RBAC keys) | Flexible and auditable; no hardcoded role coupling |

**Sub-question:** Are `course_tag` records shared globally across all courses, or scoped per course? (Current schema: global tags, assigned via `course_tag_map`.)

**Decision:** Choose Option D. Tag operations are governed by explicit permissions (for example create/update/delete/use-tag) instead of hardcoded roles.

---

### Q-LEARN-08: Lesson Completion Trigger

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.4 — progress tracking), Slice 5 (frontend lesson viewer)

**Problem:**
PRD says: _"When a member clicks 'Complete' (after scrolling)"_ — implying the complete button only appears after the user has scrolled to the bottom.

**Options:**
| Option | Approach |
|--------|----------|
| A | Frontend enforces scroll: "Complete" button disabled/hidden until scroll to bottom detected | Best UX enforcement; but users can trick it (e.g., resize window) |
| B | "Mark complete" button always visible; no scroll enforcement | Simple; trusts the user |
| C | Backend enforces a minimum time: `completed_at` can only be set N seconds after `started_at` | Time-based enforcement; configurable via system_config |
| D | Hybrid UX: auto-enable/auto-mark when completion signal is met plus manual complete action | Balances guidance and flexibility |

**Sub-question for video lessons:** Does scroll-to-bottom detection make sense for video lessons? Should the trigger be video playback completion (>80% watched)?

**Sub-question for mini-quiz lessons:** Should completing a mini-quiz automatically mark the lesson complete?

**Decision:** Choose Option D (hybrid). Frontend supports guided completion (for example scroll/video threshold) while still allowing an explicit complete action.

---

### Q-LEARN-09: Lesson Start Trigger

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.4 — progress tracking)

**Problem:**
PRD says: _"When a member starts reading a lesson: upsert `user_lesson_progress` with `started_at`"_  
The API has `POST /api/learn/lessons/{id}/progress/start/` but it's unclear if the frontend calls this:
- **Automatically** on page load (implicit), or
- **Manually** via an explicit user action

**Options:**
| Option | Trigger |
|--------|---------|
| A | Frontend calls `start` automatically on lesson page mount (no user action required) | Zero friction; may also create `user_course_progress` on first visit |
| B | User must click "Start" / "Begin reading" explicitly | More intentional but adds friction |

**Sub-question:** Can an unauthenticated user view lesson content? (PRD says only published content, but does viewing require login?)

**Decision:** Choose Option B. Lesson start is explicit via `POST /progress/start` from a user action.

---

### Q-LEARN-10: Outline Sync Failure Handling

**Status:** RESOLVED
**Blocks:** Slice 5 (Task 5.3 — Outline sync)

**Problem:**
When `POST /api/learn/lessons/{id}/sync-outline/` is called but Outline is unreachable:
- PRD edge case: _"Outline document is deleted on Outline → Sync returns an error, shows a warning; old content remains"_
- No timeout value specified.
- No retry mechanism specified.

**Decisions needed:**
1. **Timeout:** How long should the Outline API call wait before timing out? (Suggest: 10–30 seconds)
2. **Error response:** Should sync failure return HTTP 503 with error detail, or 200 with a `{warning: "..."}` body?
3. **Async vs sync:** Should the sync be a synchronous API call (blocks until done) or an async background task (returns immediately, notifies when complete)?

**Options for sync mode:**
| Option | Mode | Pros | Cons |
|--------|------|------|------|
| A | Synchronous (blocking) | Simple; immediate feedback | Slow page response if Outline is slow |
| B | Async via Celery/background task | Non-blocking; better UX | Requires Celery setup (new dependency) |
| C | Async via Django Channels (existing dep) | Non-blocking; reuses existing infra | More complex implementation |

**Decision (original):** Choose Option B. Outline sync runs async through background jobs. API returns accepted job state; previous lesson content remains active until sync success.

**Decision (revised 2026-04-15):** MVP uses **Option A — synchronous blocking**. Celery is not in the current tech stack; adding it for a single deferrable feature is premature. Backend calls Outline API synchronously, returns 503 on failure, old content preserved. Async via Celery remains a future enhancement to add when Celery is introduced for other features.

---

### Q-CHALL-01: Challenge Instance Scope in MVP

**Status:** RESOLVED → Option C
**Decision date:** 2026-04-15
**Blocks:** ~~Slice 6 (Task 6.3 — deployment, instance management)~~ — unblocked

**Problem:**
Challenges can have deployable instances (e.g., Docker containers for CTF boxes). The `challenge_instance` table exists with `expires_at`, `status`, etc. But the "external deployment system" is not specified anywhere in the codebase or docs.

**Options considered:**
| Option | Scope |
|--------|-------|
| A | Full instance management in Slice 6 (deploy, status check, stop, expire) | Feature-complete; significant complexity |
| B | Defer instance management; implement static+regex flag challenges only in MVP | Launch sooner; add instances post-MVP |
| C | Implement instance model + API stubs; no real deployment (mock responses) | Frontend can be built; deferred integration |

**Decision: Option C — API stubs with MockDeploymentBackend**

**Rationale:**
- External deployment system (`SocketDeploymentBackend`) is a separate project, not yet built. Full integration (Option A) is blocked by external dependency.
- Content split is ~50/50 static/instance. Fully deferring (Option B) would leave the instance frontend half-built.
- Option C ships Wave 1 (static + regex flags fully functional) while letting frontend build the full instance panel against a mock backend. When the external system is ready, only the backend implementation swaps — no API contract change.

**Implementation notes:**
- Wave 1 (Slice 6): Implement `MockDeploymentBackend` satisfying `InstanceDeploymentBackend` Protocol (R-ARCH-12). `deploy()` returns fake `instance_info`; `stop()` returns True.
- Wave 2 (post-MVP): Replace `MockDeploymentBackend` with `SocketDeploymentBackend`. No API or frontend change required.
- INSTANCE-type flag submission (comparing against `challenge_instance.flag_value`) is included in Wave 1 since the flag-check logic doesn't depend on the real deployment backend.

---

### Q-CHALL-02: Instance Deployment Protocol

**Status:** RESOLVED → See [R-ARCH-12](#r-arch-12-instance-deployment--strategy-pattern)
**Blocks:** Slice 6 (Task 6.3 — instance management)

Instance deployment uses a Strategy pattern with `InstanceDeploymentBackend` Protocol. Current backend: `SocketDeploymentBackend`. Instance system is a **separate project**; ILS calls the interface only. See R-ARCH-12 for full decision.

---

## RESOLVED Decisions

> Decisions already made and documented. Implementation must follow these.

---

### R-ARCH-01: API-Based Authorization (Not Resource-Based)

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.1`, `docs/REQUIREMENTS.md`

All published content is accessible to all members. No per-object ownership ACL. Roles are Admin, Editor, Member. Every endpoint requires a specific named permission encoded in JWT.

---

### R-ARCH-02: JWT Permission Claims (No DB Hit Per Request)

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.2`

Permissions are encoded in the access token at issue time. `user_permission_cache` stores the encoded permission set, versioned by `user.permission_version`. On JWT issue: use cache if version matches, else recompute.

---

### R-ARCH-03: Dot-Separated Path for Tree Structures

**Decision date:** 2026-03-12 (updated from pre-project)
**Source:** `docs/ARCHITECTURE.md §4.5`, `docs/DATA_MODEL.md §3 BaseNode`

**Previous:** Materialized path `/parent_id/child_id/` e.g. `/1/3/10/`. **Superseded.**

**Current:** Dot-separated `path` field. Format: `"parent_id.child_id"` e.g. `"1.3"`.
- Lazy loading is primary: `parent_id` filter to get direct children.
- `path` is for validation/depth checks, not primary navigation.
- No `text_pattern_ops` index needed (path not used for LIKE queries).
- Move operation: bulk update `path` for self + all descendants.

---

### R-ARCH-04: Node/Item Pattern for All Content Trees

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.6`

`is_item=False` = folder node. `is_item=True` = leaf node with FK to content (lesson/challenge/quiz). All tree operations go through Node; never bypass to access content directly.

---

### R-ARCH-05: External Integrations via system_config

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.7`

Outline URL, GitLab URL, instance deploy server URLs stored in `system_config`. Per-record content uses relative paths or IDs, not absolute URLs. Admins can change external URLs without touching content records.

---

### R-ARCH-06: No Circular FK — Quiz/QuizNode

**Decision date:** 2026-03-09
**Source:** `openmemory.md`, DB schema review

`quiz_node.quiz_id → quiz` only (one-way). No `quiz.node_id` FK. Access node from quiz via Django reverse relation (`.node` accessor).

---

### R-ARCH-07: Join Table Audit — CreateAudit Only

**Decision date:** 2026-03-09
**Source:** `openmemory.md`, DB schema review

Join tables (tag maps, role_permission) use `CreateAudit` only — no `updated_at`/`updated_by`. These tables are insert/delete only; records are never updated in-place.

---

### R-AUTH-01: Refresh Token Hash Storage (SHA-256)

**Decision date:** Pre-project
**Source:** `docs/IMPL_PLAN.md §Task 1.1`

`refresh_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()` stored in `user_session`. Raw token never persisted.

---

### R-AUTH-02: Password Reset via itsdangerous TimestampSigner

**Decision date:** Pre-project
**Source:** `docs/IMPL_PLAN.md §Task 1.4`

No DB storage for reset tokens. Uses `itsdangerous.TimestampSigner(settings.SECRET_KEY)`. Token expires in 3600 seconds.

---

### R-AUTH-03: Permission Cache Invalidation via Version Counter

**Decision date:** Pre-project
**Source:** `docs/IMPL_PLAN.md §Task 2.3`

`user.permission_version` increments when admin changes roles/permissions. On JWT issue: compare cached version with current. Mismatch → recompute. Only the next token refresh gets new permissions (not mid-session).

---

### R-AUTH-04: Flat Permissions — No Hierarchy

**Decision date:** 2026-03-12 (updated from pre-project)
**Source:** `docs/ARCHITECTURE.md §4.3`, `docs/DATA_MODEL.md §2 permission`

**Previous:** Permission hierarchy with `parent_id` — disabling parent disables children at encode time. **Superseded.**

**Current:** Permissions are **flat** — no `parent_id`, no `pre_path`, no hierarchy.
- Roles provide the only grouping mechanism.
- `is_active=False` disables a single permission (no cascade).
- No circular reference possible (no parent_id).

---

### R-AUTH-05: Permission Auto-Discovery & Built-in Roles at Startup

**Decision date:** 2026-03-12 (updated from pre-project)
**Source:** `docs/ARCHITECTURE.md §4.4`, `docs/prd/02-authorization.md`

**Previous:** Scan URL patterns at startup, format `"domain.action"`. **Updated.**

**Current:**
- Decorator `@add_role_granted('Admin', 'Editor', 'Member')` can be used at class-level and handler-level.
- At startup (`AppConfig.ready()`): scan decorated views and route action maps, auto-create permissions.
- **Permission name format:** `{app_label}.{resource_name}.{handler_method_name}` (lowercase).
  - `resource_name`: class name bỏ hậu tố `ViewSet`/`View`/`APIView`/`GenericViewSet`, normalize snake_case
  - `handler_method_name`: method Python xử lý endpoint (e.g. `list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`, `tree`, `submit_flag`, `get`, `post`)
  - Ví dụ: `api.course.tree`, `api.challenge.submit_flag`, `auth_app.register.post`
- Grant precedence per endpoint: handler-level decorator > class-level decorator.
- For default mixin handlers that require specific roles, explicitly override method and call `super()` so behavior stays unchanged while grant is explicit in code.
- Built-in roles auto-created with `is_system=True` — cannot be deleted/renamed via API.
- Permissions are assigned to roles based on decorator arguments.
- Permissions no longer present in code are set to `is_active=False`.
- **Permissions are read-only via API** — no PATCH/POST/DELETE on permission records.

---

### R-DATA-01: Enums as Django TextChoices

**Decision date:** Pre-project
**Source:** `docs/DATA_MODEL.md §1`

All DB enums (`content_status`, `lesson_type`, `challenge_difficulty`, etc.) map to Django `TextChoices` classes. Already implemented in `backend/api/models.py`.

---

### R-DATA-02: BaseNode Includes Position Field

**Decision date:** 2026-03-09
**Source:** `openmemory.md`, DB schema review

All node types (`course_node`, `challenge_node`, `quiz_node`) have a `position` field for ordering. Position normalization (0, 1, 2, …) after each reorder operation.

---

### R-DATA-03: `lesson_question.position` — Ordering in Mini-Quiz

**Decision date:** 2026-03-09
**Source:** `openmemory.md`

`lesson_question` table has `position` field for controlling question order within a lesson's embedded mini-quiz.

---

### R-DATA-04: `ChallengeInstance` — Partial Unique Index

**Decision date:** 2026-03-09
**Source:** `openmemory.md`

Partial UNIQUE INDEX on `(user_id, challenge_id)` WHERE `status='running'`. One running instance per user per challenge. Multiple stopped/terminated allowed.

---

### R-DATA-05: Single Source of Truth for Case Sensitivity

**Decision date:** 2026-03-09
**Source:** `openmemory.md`

`quiz_question.case_sensitive` is the single source. `quiz_question_answer` does NOT have a `is_case_sensitive` field.

---

### R-DATA-06: `user_quiz_progress` — Aggregate via Signal

**Decision date:** 2026-03-09
**Source:** `openmemory.md`

`user_quiz_progress` (best_score, attempt_count, timestamps) is NOT calculated on the fly. It is updated via Django signal when a `UserQuizAttempt` finishes.

---

### R-LEARN-01: Course Completion → Learning Point Award

**Decision date:** Pre-project
**Source:** `docs/prd/03-learn.md §FR-LEARN-06`

On course completion: add `course.learning_point` to `user_profile.total_learning_point`. Triggered when ALL lessons in the course are completed (via signal chain: `UserLessonProgress.completed_at` set → check course → update `UserCourseProgress` → update `UserProfile`).

---

### R-LEARN-02: course_node Root Node Auto-Created

**Decision date:** Pre-project
**Source:** `docs/prd/03-learn.md §FR-LEARN-03`

Every course has a hidden root node created automatically when the course is created. The root node is not shown in the UI node tree (it's the implicit container). All top-level visible nodes have `parent_id` = root node.

---

### R-LEARN-03: Max Folder Depth via system_config

**Decision date:** Pre-project
**Source:** `docs/prd/03-learn.md §FR-LEARN-08`

`system_config[learn.max_tree_depth]` controls maximum nested folder count. Validate on **create** and on **move**. Violation returns HTTP 400 `"Maximum folder depth exceeded"`.

---

### R-AUTH-06: Binary Bitmap Permission Encoding

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.2`, `docs/DATA_MODEL.md §2 permission`, `docs/prd/02-authorization.md`

Permissions encoded as binary bitmap (≤256 permissions = 256 bits = 32 bytes).
- Each permission has auto-increment `id`. Bit at position `id` = 1 if granted.
- Bitmap base64-encoded into JWT claims (≈44 chars).
- JWT format: `{"permissions": "<base64>", "pv": <version>}`.
- Check: decode base64 → test bit at `permission.id`.

---

### R-AUTH-07: Per-User Permission Version (Not Global)

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.2`, `docs/DATA_MODEL.md §2 user`, `docs/CONFIG.md`

`user.permission_version` (INT, default 0) is per-user, NOT a global `system_config` key.
- Incremented when admin changes any of: `user_role`, `user_permission`, `role_permission` affecting this user.
- `user_permission_cache.permission_version` compared against `user.permission_version`.
- Global `system_config['permission_version']` removed entirely.

---

### R-AUTH-08: Permissions Read-Only via API

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.1`, `docs/prd/02-authorization.md`

Permission records are **read-only** via API. Admin can only GET (list/retrieve). No PATCH, POST, DELETE on `/api/admin/permissions/` (legacy `/api/authz/permissions/` is historical only). Permissions are managed solely by code (auto-discovery at startup).

---

### R-AUTH-09: User Permission Deny-Only (No Direct Grant)

**Decision date:** 2026-03-12
**Source:** `docs/DATA_MODEL.md §2 user_permission`, `docs/prd/02-authorization.md`

`user_permission` table has **no `is_granted` column**. Existence of a row = deny. Only deny entries allowed. Constraint: deny entry only valid if user actually has the permission via a role. Clean up stale deny entries when user removed from role.

---

### R-AUTH-10: Built-in Roles via Decorator

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.4`, `docs/prd/02-authorization.md`

Built-in roles (Admin, Editor, Member) are auto-created at startup via `@add_role_granted` decorator. Have `is_system=True` flag — cannot be deleted, renamed, or have permissions modified via API. Permission assignments for system roles are controlled exclusively by the startup scan (`@add_role_granted` metadata).

---

### R-AUTH-12: Hybrid Endpoint Role Grant Resolution

**Decision date:** 2026-03-31
**Source:** `docs/ARCHITECTURE.md §4.4`, `docs/IMPL_PLAN.md §Slice 2`

Permission grant resolution for endpoint handlers uses a hybrid model:
- Class-level `@add_role_granted(...)` defines default roles for all handlers in a view.
- Handler-level `@add_role_granted(...)` overrides class defaults for selected handlers.
- For default mixin handlers requiring specific roles, explicitly override method and call `super()` to keep implementation clear and deterministic.
- DRF route action maps (`callback.actions`) remain the endpoint identity source for discovery.
- Final precedence: handler-level decorator > class-level decorator.

---

### R-ARCH-08: No Database Triggers

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.13`

All denormalized field updates (counters, aggregates, progress) handled at Django application level (signals/service layer). No PostgreSQL triggers or stored procedures. Rationale: logic stays in codebase, testable, versionable.

---

### R-ARCH-09: No Circular FK Anywhere

**Decision date:** 2026-03-12 (expanded from R-ARCH-06)
**Source:** `docs/ARCHITECTURE.md §7`, `docs/DATA_MODEL.md`

No circular foreign keys in any table. Quiz↔QuizNode: one-way FK only. Course↔CourseNode: one-way FK. Permission: no `parent_id` (flat). Access reverse direction via Django reverse relations.

---

### R-ARCH-10: Explicit Join Tables (No ManyToManyField)

**Decision date:** 2026-03-12 (formalized from pattern)
**Source:** `docs/ARCHITECTURE.md §8`, `openmemory.md`

All M2M relationships use explicit join tables with `CreateAudit` — never Django `ManyToManyField`. This gives control over audit fields, constraints, and migration.

---

### R-ARCH-11: AUTH_USER_MODEL (AbstractBaseUser)

**Decision date:** 2026-03-12
**Source:** `docs/DATA_MODEL.md §2 user`

Custom user model via `AUTH_USER_MODEL` setting, extending `AbstractBaseUser`. Provides password hashing (`set_password`/`check_password`), `createsuperuser` command, and Django admin compatibility.

---

### R-ARCH-12: Instance Deployment — Strategy Pattern

**Decision date:** 2026-03-12
**Source:** `docs/ARCHITECTURE.md §4.10`, `docs/REQUIREMENTS.md §2.4`

Instance deployment uses Strategy pattern with a `Protocol` class (`InstanceDeploymentBackend`). Current implementation: `SocketDeploymentBackend` (required for university course). Replaceable with HTTP/gRPC backends later. Instance management is a **separate project** — ILS only calls the interface.

---

### R-DATA-07: Status on Lesson and Quiz Question

**Decision date:** 2026-03-12
**Source:** `docs/DATA_MODEL.md §2 lesson`, `docs/DATA_MODEL.md §2 quiz_question`

Both `lesson` and `quiz_question` have `status content_status NOT NULL DEFAULT 'draft'`. Values: draft, published, archived. Published content visible to all members; draft/archived admin/editor only.

---

### R-DEV-01: Authorization Bypass Toggle for Development

**Decision date:** 2026-03-12
**Source:** `docs/CONFIG.md`, `docs/ARCHITECTURE.md §4.11`

`system_config[auth.authorization_enabled]` (bool, default `true`) allows disabling RBAC permission checks at runtime.

**When `false`:**
- All authenticated users bypass permission checks — every endpoint accessible.
- Authentication is still required (401 for unauthenticated).
- Permission auto-discovery and role sync still happen at startup.
- JWT still contains bitmap — just not checked.

**Purpose:** Enables feature development (Slices 3–9, 11) without needing Slice 2 (Authorization) fully complete. Decouples feature slices from RBAC implementation.

**Constraint:** Must be `true` in production. Default value is `true` (seed_config sets this).

---

### R-AUTH-13: Permission Key Auto-Derivation — Single Source of Truth

**Decision date:** 2026-04-14
**Source:** `docs/ARCHITECTURE.md §4.5`, `auth_app/permissions.py`

Permission keys (e.g., `api.role.list`) are **derived at runtime** by `HasJWTPermission` using `derive_permission_key(view_class, action)` — the same shared function used by `discover_permissions()` at startup. This eliminates the previous `action_permission_map` dict (which required manual synchronization between scanner and runtime).

**Key guarantees:**
- Scanner output and runtime key lookups always match — no possible mismatch.
- Renaming a ViewSet automatically updates both the scanner-generated permission name AND the runtime check; no string literals to update.
- `HasJWTPermission('explicit.key')` still works for the rare edge case needing an override.

**No-JWT-bitmap fallback** (for test environments using `force_authenticate`):
When `request.auth` is not a JWT dict (no bitmap present), `HasJWTPermission` falls back to checking `@add_role_granted` metadata against the user's DB state:
1. `is_superuser` → allow
2. `'Member' in effective_roles` → allow (any authenticated user qualifies)
3. Otherwise → `user.user_roles.filter(...)` DB check

This fallback is **never reached in production** — all JWT-authenticated requests carry a bitmap.

**View pattern (post-refactor):**
```python
@add_role_granted('Admin')
class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasJWTPermission]
    # No action_permission_map — key derived automatically
```

---

### R-ARCH-13: Unified Views Directory — No Admin/Regular Split

**Decision date:** 2026-04-14
**Source:** `docs/ARCHITECTURE.md §3`, `api/views/`

All ViewSets — whether they serve admin operations or regular user operations — live under `api/views/`. There is no `admin_views.py` or similar separation. Access control is enforced uniformly via `permission_classes = [IsAuthenticated, HasJWTPermission]` on every ViewSet, with `@add_role_granted` determining which roles can access each action. The URL prefix (`/api/admin/*` vs `/api/*`) is a routing convention only, not a security boundary.

**Rationale:** Separating admin views created divergent permission patterns (e.g., `IsAdminUser` in `SystemConfigViewSet`, different mixin usage). Unifying the pattern ensures all endpoints go through the same RBAC enforcement regardless of their URL path.

---

### R-DEV-02: Functional Requirements Priority Over Non-Functional

**Decision date:** 2026-03-12
**Source:** Project implementation strategy

**Decision:** During implementation, **functional requirements take priority** over non-functional requirements. Non-functional requirements (logging, rate limiting, i18n, theming, CDN, etc.) are implemented only when:
1. They are essential for the functional feature to work (e.g., JWT auth is needed for login).
2. All functional requirements for a slice are complete.
3. Explicitly requested by the team.

**Rationale:** Limited development time — focus on delivering working features first. Non-functional polish can be layered in after the core feature set is functional.

**What this means for implementation:**
- Slice 1 (Auth): Implement login/register/JWT first. Password policy enforcement, SMTP email, advanced rate limiting → defer until core auth works.
- Slice 2 (RBAC): Implement permission discovery + role CRUD + JWT encoding. Fine-tuned cache invalidation optimization → defer.
- Slices 5–7: Implement CRUD + progress tracking. Caching, pagination optimization, advanced filtering → defer.
- Frontend slices: Implement working views first. i18n, theming, animation, accessibility → defer.

---
