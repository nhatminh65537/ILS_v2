# DECISIONS.md — ILS v2 Design Decisions & Open Questions

> Living document. Track every decision that shapes implementation.
> **OPEN** = needs human decision before coding can begin.
> **RESOLVED** = decision made; implementation must follow it.
>
> Last updated: 2026-03-12

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
| [Q-INFRA-01](#q-infra-01-frontend-source-directory) | Frontend src/ directory layout | Slice 4–11 | **OPEN** |
| [Q-INFRA-02](#q-infra-02-api-url-prefix-convention) | API URL prefix convention | Slice 1–11 | **OPEN** |
| [Q-INFRA-03](#q-infra-03-email-backend-for-password-reset) | Email backend for password reset | Slice 1 | **OPEN** |
| [Q-INFRA-04](#q-infra-04-cache-backend-for-rate-limiting) | Cache backend for rate limiting | Slice 1 | **OPEN** |
| [Q-INFRA-05](#q-infra-05-websocket-jwt-auth-method) | WebSocket JWT auth method | Slice 7 | **OPEN** |
| [Q-INFRA-06](#q-infra-06-client-side-token-storage) | Client-side token storage | Slice 1, 4 | **OPEN** |
| [Q-INFRA-07](#q-infra-07-i18n-language-strategy) | i18n language and timing | Slice 4 | **OPEN** |
| [Q-INFRA-08](#q-infra-08-frontend-ui-component-library) | Frontend UI component library | Slice 4 | **OPEN** |
| [Q-AUTH-01](#q-auth-01-default-role-for-new-users) | Default role for newly registered users | Slice 1–2 | **OPEN** |
| [Q-AUTH-02](#q-auth-02-first-admin-creation-mechanism) | First admin account creation | Slice 0–1 | **OPEN** |
| [Q-AUTH-03](#q-auth-03-sso-only-lockout-fallback) | SSO-only lockout fallback | Slice 1 | **OPEN** |
| [Q-LEARN-01](#q-learn-01-lesson-node-creation-atomicity) | Lesson node creation: 1-step or 2-step | Slice 5 | **OPEN** |
| [Q-LEARN-02](#q-learn-02-mini-quiz-question-source) | Mini-quiz question source | Slice 5 | **OPEN** |
| [Q-LEARN-03](#q-learn-03-course-progress-on-structure-change) | Course progress when structure changes | Slice 5 | **OPEN** |
| [Q-LEARN-04](#q-learn-04-course-delete-strategy) | Course delete: soft-delete or archive | Slice 5 | **OPEN** |
| [Q-LEARN-05](#q-learn-05-slug-conflict-resolution) | Slug conflict resolution | Slice 5 | **OPEN** |
| [Q-LEARN-06](#q-learn-06-outline-url-frontend-exposure) | Outline URL config: backend-only or public | Slice 5 | **OPEN** |
| [Q-LEARN-07](#q-learn-07-tag-creation-permissions) | Who can create course tags | Slice 5 | **OPEN** |
| [Q-LEARN-08](#q-learn-08-lesson-completion-trigger) | Lesson completion trigger (scroll enforcement) | Slice 5 | **OPEN** |
| [Q-LEARN-09](#q-learn-09-lesson-start-trigger) | Lesson start: implicit or explicit | Slice 5 | **OPEN** |
| [Q-LEARN-10](#q-learn-10-outline-sync-failure-handling) | Outline sync failure / timeout behavior | Slice 5 | **OPEN** |
| [Q-CHALL-01](#q-chall-01-challenge-instance-scope) | Challenge instances in MVP or deferred | Slice 6 | **OPEN** |
| [Q-CHALL-02](#q-chall-02-instance-deployment-protocol) | Instance deployment external system spec | Slice 6 | **OPEN** |

---

## OPEN Questions

---

### Q-INFRA-01: Frontend Source Directory

**Status:** OPEN
**Blocks:** Slice 4 (Frontend Foundation) and all frontend slices

**Problem:**
The current Next.js scaffold has code at `frontend/app/` (Next.js default flat layout).
`docs/IMPL_PLAN.md` consistently references `frontend/src/app/`, `frontend/src/components/`, `frontend/src/store/`, `frontend/src/lib/` — implying a `src/` wrapper.

**Options:**
| Option | Layout | Pros | Cons |
|--------|--------|------|------|
| A | `frontend/app/` (current) | No migration needed; fewer directories | Harder to separate app code from config at root |
| B | `frontend/src/app/` (IMPL_PLAN) | Clean separation; standard convention for large projects | Need to move existing files; update `tsconfig.json` paths |

**Decision:** _(not yet made — choose A or B)_

**Impact on IMPL_PLAN:** Slice 4, 5, 6, 7, 8, 9, 10, 11 all reference `frontend/src/`.

---

### Q-INFRA-02: API URL Prefix Convention

**Status:** OPEN
**Blocks:** All API slices (Slice 1–11)

**Problem:**
There is a conflict between the PRD endpoints and the IMPL_PLAN endpoints:
- `docs/prd/03-learn.md` uses `/api/learn/courses/`, `/api/learn/lessons/`, `/api/learn/categories/`
- `docs/IMPL_PLAN.md` (Task 5.1) uses `/api/courses/`, `/api/lessons/`, `/api/course-categories/`

The same conflict may exist for challenges and quiz PRDs. A consistent scheme must be chosen before any URL routing is implemented.

**Options:**
| Option | Example URL | Pros | Cons |
|--------|-------------|------|------|
| A | `/api/courses/` (IMPL_PLAN) | Shorter URLs; standard REST convention | No namespace; may clash if names overlap across domains |
| B | `/api/learn/courses/` (PRD) | Clear namespacing per domain | Slightly longer; extra URL nesting |

**Sub-questions:**
- Should auth endpoints be `/api/auth/` (IMPL_PLAN) or `/auth/`?
- Should admin-only endpoints be nested under `/api/admin/` or use permissions at the same path?

**Decision:** _(not yet made — choose A or B, apply consistently to all domains)_

---

### Q-INFRA-03: Email Backend for Password Reset

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-INFRA-04: Cache Backend for Rate Limiting

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-INFRA-05: WebSocket JWT Auth Method

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-INFRA-06: Client-Side Token Storage

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-INFRA-07: i18n Language Strategy

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-INFRA-08: Frontend UI Component Library

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-AUTH-01: Default Role for Newly Registered Users

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-AUTH-02: First Admin Account Creation

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-AUTH-03: SSO-Only Lockout Fallback

**Status:** OPEN
**Blocks:** Slice 1 (SSO setup), Slice 3 (system config)

**Problem:**
If an admin sets `auth.local_login_enabled=false` and `auth.sso_enabled=true`, but Authentik goes offline, all users are locked out. There is no documented fallback.

**Options:**
| Option | Approach |
|--------|----------|
| A | No fallback; accept the risk (admin must fix Authentik first) | Simple; no extra code |
| B | Emergency local login bypass via settings.py flag (not in system_config) | Harder to accidentally enable; requires server access |
| C | Always allow local login for `is_superuser=True` users regardless of system_config | Small scope; superusers can always get in |

**Decision:** _(not yet made)_

---

### Q-LEARN-01: Lesson Node Creation Atomicity

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.2 — CourseNode tree API, Task 5.3 — Lesson CRUD)

**Problem:**
The PRD says: _"Tạo lesson node: tạo `lesson` + `course_node` với `is_item=True`"_ — implied to be one atomic operation.  
IMPL_PLAN has **separate endpoints**: `POST /api/courses/{slug}/tree/` (create node) and `POST /api/lessons/` (create lesson).

Two possible flows:

**Option A — One-step (atomic):**
```
POST /api/courses/{slug}/nodes/
Body: { is_item: true, lesson_type: "markdown", title: "...", parent_id: 5, position: 2 }
→ Server creates lesson + course_node in one DB transaction
→ Returns: { node: {...}, lesson: {...} }
```

**Option B — Two-step:**
```
1. POST /api/lessons/    → creates lesson; returns lesson.id
2. POST /api/courses/{slug}/nodes/
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
(Current DB schema has `course_node.lesson_id` as a FK — no UNIQUE constraint mentioned. Clarification needed.)

**Decision:** _(not yet made — choose A or B)_

---

### Q-LEARN-02: Mini-Quiz Question Source

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-LEARN-03: Course Progress on Structure Change

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.4 — progress tracking)

**Problem:**
When new lessons are added to a published course, or existing lessons are deleted, existing `user_course_progress` records have an incorrect picture of progress (the denominator changes).

**Options:**
| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Total calculated dynamically at query time | Always accurate | Extra JOIN on every progress query |
| B | Snapshot total at start of course (creation of user_course_progress) | Fast reads | Stale on structure change |
| C | Signal on structure change → bulk update all affected user_course_progress totals | Accurate + fast reads | Complex signal logic |

**Sub-question:** Should modifying a published course's structure be restricted (prompt to un-publish first)?

**Decision:** _(not yet made)_

---

### Q-LEARN-04: Course Delete Strategy

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.1 — Course CRUD)

**Problem:**
PRD says: _"Soft-delete hoặc archive"_ without choosing. The codebase has `SoftDeleteAudit` model (adds `deleted_at`) AND a `status` field with `archived` value. These are two different mechanisms.

**Options:**
| Option | Mechanism | Behavior |
|--------|-----------|----------|
| A | Archive only (`status=archived`) | Course stays visible to admins/editors; no physical deletion |
| B | Soft delete (`SoftDeleteAudit.deleted_at`) | Course hidden from all queries by default; recoverable |
| C | Hard delete | Course + nodes + lessons permanently removed; no recovery |
| D | Archive first, then hard delete (two-step) | Safe but complex |

**Sub-question:** Should deleting a course cascade delete all nodes, lessons, and user progress records? Or should progress be preserved for historical data?

**Decision:** _(not yet made)_

---

### Q-LEARN-05: Slug Conflict Resolution

**Status:** OPEN
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

**Decision:** _(not yet made)_

---

### Q-LEARN-06: Outline URL Frontend Exposure

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.3 — Lesson CRUD, Outline integration)

**Problem:**
PRD says: _"URL học liệu trong content dùng Outline base URL từ system_config (không hardcode)"_  
`system_config[outline.url]` contains the base URL of the Outline server.

Frontend needs the Outline base URL to render links inside lesson content. But `outline.api_token` is secret.

**Options:**
| Option | Approach |
|--------|----------|
| A | `outline.url` is public (non-secret config); frontend fetches it via `/api/config/outline.url/` | Simple; URL exposed to all authenticated users |
| B | Backend rewrites Outline URLs in content before serving to frontend | Zero exposure; but complex content transformation |
| C | Add a dedicated `/api/config/public/` endpoint that returns only non-secret config values | Clean separation; reusable for other public configs |

**Decision:** _(not yet made)_

---

### Q-LEARN-07: Tag Creation Permissions

**Status:** OPEN
**Blocks:** Slice 5 (FR-LEARN-02 — Category & Tag Management)

**Problem:**
PRD specifies CRUD for `course_tag` but does not define which role can create/delete tags.

**Options:**
| Option | Who can create tags |
|--------|---------------------|
| A | Admin only | Controlled vocabulary; editors can only use existing tags |
| B | Editor and Admin | Flexible; editors can create tags for their content |
| C | Any authenticated user | Most flexible; risks tag sprawl |

**Sub-question:** Are `course_tag` records shared globally across all courses, or scoped per course? (Current schema: global tags, assigned via `course_tag_map`.)

**Decision:** _(not yet made)_

---

### Q-LEARN-08: Lesson Completion Trigger

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.4 — progress tracking), Slice 5 (frontend lesson viewer)

**Problem:**
PRD says: _"Khi member nhấn 'Complete' (sau scroll)"_ — implying the complete button only appears after the user has scrolled to the bottom.

**Options:**
| Option | Approach |
|--------|----------|
| A | Frontend enforces scroll: "Complete" button disabled/hidden until scroll to bottom detected | Best UX enforcement; but users can trick it (e.g., resize window) |
| B | "Mark complete" button always visible; no scroll enforcement | Simple; trusts the user |
| C | Backend enforces a minimum time: `completed_at` can only be set N seconds after `started_at` | Time-based enforcement; configurable via system_config |

**Sub-question for video lessons:** Does scroll-to-bottom detection make sense for video lessons? Should the trigger be video playback completion (>80% watched)?

**Sub-question for mini-quiz lessons:** Should completing a mini-quiz automatically mark the lesson complete?

**Decision:** _(not yet made)_

---

### Q-LEARN-09: Lesson Start Trigger

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.4 — progress tracking)

**Problem:**
PRD says: _"Khi member bắt đầu đọc lesson: upsert `user_lesson_progress` với `started_at`"_  
The API has `POST /api/learn/lessons/{id}/progress/start/` but it's unclear if the frontend calls this:
- **Automatically** on page load (implicit), or
- **Manually** via an explicit user action

**Options:**
| Option | Trigger |
|--------|---------|
| A | Frontend calls `start` automatically on lesson page mount (no user action required) | Zero friction; may also create `user_course_progress` on first visit |
| B | User must click "Start" / "Begin reading" explicitly | More intentional but adds friction |

**Sub-question:** Can an unauthenticated user view lesson content? (PRD says only published content, but does viewing require login?)

**Decision:** _(not yet made)_

---

### Q-LEARN-10: Outline Sync Failure Handling

**Status:** OPEN
**Blocks:** Slice 5 (Task 5.3 — Outline sync)

**Problem:**
When `POST /api/learn/lessons/{id}/sync-outline/` is called but Outline is unreachable:
- PRD edge case: _"Outline document bị xóa trên Outline → Sync trả lỗi, hiển thị warning; content cũ vẫn còn"_
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

**Decision:** _(not yet made)_

---

### Q-CHALL-01: Challenge Instance Scope in MVP

**Status:** OPEN
**Blocks:** Slice 6 (Task 6.3 — deployment, instance management)

**Problem:**
Challenges can have deployable instances (e.g., Docker containers for CTF boxes). The `challenge_instance` table exists with `expires_at`, `status`, etc. But the "external deployment system" is not specified anywhere in the codebase or docs.

Instance management may be a significant external integration effort. The question is whether it belongs in the initial MVP.

**Options:**
| Option | Scope |
|--------|-------|
| A | Full instance management in Slice 6 (deploy, status check, stop, expire) | Feature-complete; significant complexity |
| B | Defer instance management; implement static+regex flag challenges only in MVP | Launch sooner; add instances post-MVP |
| C | Implement instance model + API stubs; no real deployment (mock responses) | Frontend can be built; deferred integration |

**Sub-question:** Is there an existing container orchestration system at the organization (Kubernetes, Docker Compose, custom HTTP API)?

**Decision:** _(not yet made)_

---

### Q-CHALL-02: Instance Deployment Protocol

**Status:** OPEN
**Blocks:** Slice 6 (Task 6.3 — instance management)
**Prerequisite:** Q-CHALL-01 answered (instances in scope)

**Problem:**
How does ILS create, stop, and query the status of challenge instances? No external system is specified.

**Decisions needed:**
1. What is the external deployment system? (e.g., custom HTTP API, Kubernetes API, Docker API)
2. What is the request/response format for creating an instance?
3. How does the instance report its ready state and assigned flag back to ILS?
4. Is instance lifecycle managed synchronously or via polling/webhook?

**Decision:** _(not yet made — depends on infrastructure)_

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

### R-ARCH-03: Materialized Path for Tree Structures

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.5`, PRD-03 AC-LEARN-05

Format: `/parent_id/child_id/` e.g. `/1/3/10/`  
Subtree query: `pre_path__startswith='/1/3/'`  
Move operation: bulk update `pre_path` for self + all descendants.  
PostgreSQL requires `text_pattern_ops` index for LIKE performance.

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

### R-AUTH-04: Permission Hierarchy — Application-Level Cascade

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.3`

Disabling a parent permission disables all descendants at **encode time**, not via DB cascade. Re-enabling parent restores children to their individual `is_active` state.

---

### R-AUTH-05: Permission Auto-Discovery at Startup

**Decision date:** Pre-project
**Source:** `docs/ARCHITECTURE.md §4.4`, `docs/IMPL_PLAN.md §Task 2.1`

All permissions are created by scanning URL patterns at startup (`AppConfig.ready()`). Permissions are never manually created. Format: `"domain.action"` e.g. `"learn.view"`, `"challenge.submit"`.

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

`system_config[learn.max_folder_depth]` controls maximum nested folder count. Validate on **create** and on **move**. Violation returns HTTP 400 `"Maximum folder depth exceeded"`.

---
