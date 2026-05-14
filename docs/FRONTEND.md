# Frontend — Setup, Conventions, Page Inventory

> Tài liệu hợp nhất cho frontend ILS v2 (Next.js 16 App Router + React 19 + Tailwind v4 + Zustand).
> Merge từ `FE_SETUP.md` + `FE_CONVENTIONS.md` + `FE_PAGE_INVENTORY.md` ở Session 5 (C6).
> Mapping anchor cũ → mới: xem `docs/normalization/LEDGER.md`.

---

## 1. Setup

### 1.1 Prerequisites

- Node.js: >= 20
- npm: >= 10
- OS: Windows/macOS/Linux

### 1.2 Install

```bash
cd frontend
npm install
```

### 1.3 Environment Files

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MSW=true
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

Create/update `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MSW=false
```

Notes:
- `NEXT_PUBLIC_API_URL` points to backend origin; service paths already include `/api/*`.
- `NEXT_PUBLIC_WS_URL` is used by WebSocket hooks (`useNotificationSocket`, `useQuizSession`).
- MSW is enabled by default in development and disabled in production.
- For frontend-only verification, keep `NEXT_PUBLIC_ENABLE_MSW=true`.

### 1.4 Development Commands

```bash
cd frontend
npm run dev
```

Default frontend URL:
- `http://localhost:4000`

Build and quality gates:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### 1.5 MSW Behavior

- Worker file: `frontend/public/mockServiceWorker.js`
- Provider: `src/components/providers/MswProvider.tsx`
- Handler registry: `src/mocks/handlers/index.ts` — covers all domains (auth, users, RBAC, system-config, courses, lessons, quizzes, challenges, notifications, leaderboard, admin-*).
- Fixtures: `src/mocks/data/fixtures.ts`

When `NEXT_PUBLIC_ENABLE_MSW=true`, mock handlers intercept API requests in browser. See `src/mocks/handlers/` for individual handler files (one per domain); the canonical inventory is `index.ts`.

### 1.6 i18n Behavior

- Locales: `vi`, `en`
- Default locale: `vi`
- Root `/` redirects to `/vi`
- Locale routes: `app/[locale]/*`
- Dictionaries: `frontend/messages/vi.json`, `frontend/messages/en.json`

### 1.7 Surface Routing (Current)

- User surface routes remain under `/{locale}/*` with authenticated user shell at `/{locale}/dashboard`.
- Admin surface routes remain under `/{locale}/admin/*` for development.
- Dedicated admin auth entry: `/{locale}/admin/login`.
- Admin registration route is intentionally absent.

### 1.8 Manual Smoke Checklist (Frontend-Only)

- User surface shell: `/{locale}/dashboard` has navbar + content + footer (no nav sidebar; navigation via Navbar).
- Admin login: `/{locale}/admin/login` renders dedicated admin auth form without register action.
- Admin protected shell: `/{locale}/admin/rbac` and `/{locale}/admin/config` render admin navbar/sidebar/content/footer after login.
- Admin data flow in MSW mode: RBAC and system config pages load with mock contracts (no backend dependency).

### 1.9 Add More shadcn Components

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Currently installed primitives include button/input/dialog/sheet/dropdown/table/sonner/avatar/tabs/select/checkbox/radio-group/progress/skeleton/alert/separator/badge/card/label.

---

## 2. Conventions

### 2.1 Folder Structure

- `frontend/app`: App Router pages/layouts
  - `frontend/app/[locale]/(auth)`: Guest-only routes (login/register/forgot/reset password) — `GuestOnlyGate`
  - `frontend/app/[locale]/(app)`: Authenticated general routes (dashboard/profile/notifications/leaderboard) — `UserAccessGate` + Navbar (no nav sidebar)
  - `frontend/app/[locale]/(catalog)`: Authenticated catalog routes (courses/challenges/quizzes) — `UserAccessGate` + own two-column filter layout
  - `frontend/app/[locale]/(admin)/admin`: Admin surface (dedicated admin auth entry + protected admin modules)
- `frontend/src/types`: Domain type contracts
- `frontend/src/services`: Typed API service layer
- `frontend/src/stores`: Zustand stores by domain
- `frontend/src/hooks`: Reusable hooks (`useAuth`, `useApi`, WS hooks, etc.)
- `frontend/src/lib`: Shared utilities — `axios.ts` (HTTP client + interceptors), `utils.ts` (`cn` helper), error maps, domain helpers. See `frontend/src/lib/README.md` for full inventory.
- `frontend/src/components/ui`: shadcn-generated primitives
- `frontend/src/components/features`: Domain-specific smart components
- `frontend/src/components/layouts`: Layout containers (Navbar/Sidebar/Footer/AppShell/UserLayout/AdminLayout/AuthLayout)
- `frontend/src/components/providers`: App-level providers (MSW, theme, i18n wrappers). See `frontend/src/components/README.md`.
- `frontend/src/mocks`: MSW fixtures and handlers
- `frontend/src/i18n`: Locale routing/request configuration
- `frontend/messages`: Translation dictionaries (`vi.json`, `en.json`)

### 2.2 Surface Architecture Rules

- **Two audience surfaces** — User and Admin — must be treated as distinct frontend surfaces even when sharing one Next.js app.
- **Four route groups** mapped onto the two surfaces:
  - `(auth)` — guest-only (login/register/forgot/reset) — user surface entry
  - `(app)` — authenticated general user shell, Navbar-only (no nav sidebar)
  - `(catalog)` — authenticated content-consumption pages with filter panel (courses/challenges/quizzes)
  - `(admin)/admin` — admin surface (own auth entry + protected shell)
- User surface routes and admin surface routes must not share the same layout wrapper.
- Admin entry route is `/{locale}/admin/login`; admin registration route is intentionally absent.
- Admin protected routes remain under `/{locale}/admin/*` for development compatibility.
- Vhost/domain-level split is deferred to deployment; code must keep route-level separation ready for future host split.
- **No nav sidebar in user surface.** Navigation is handled entirely by the Navbar (top bar). The `(app)/` layout sets `showSidebar={false}`.
- **Sidebar = filter panel only.** The left-side sidebar area is never used for navigation links. On catalog pages, each page client renders its own two-column layout (filter panel + content). On non-catalog pages, content is full-width.
- **Route group assignment:** Use `(app)/` for general authenticated pages (dashboard, profile, notifications, leaderboard). Use `(catalog)/` for content-consumption pages that render a filter panel (quizzes, courses, challenges). New catalog sections must go under `(catalog)/`, not `(app)/`.

### 2.3 Naming Conventions

- React components: PascalCase (`LoginForm.tsx`)
- Hooks: `useXxx.ts` (`useAuth.ts`, `useApi.ts`)
- Services: `*.service.ts` (`auth.service.ts`)
- Stores: `*.store.ts` (`auth.store.ts`)
- Types: `*.types.ts` by domain (`course.types.ts`)

### 2.4 Service Layer Rules

- Components and hooks do not call Axios directly.
- All HTTP calls go through `src/services/*`.
- Services use shared client from `src/lib/axios.ts`.
- Response error handling is centralized in Axios interceptor.

### 2.5 State Management Rules (Zustand)

- One store per domain; avoid monolithic global store.
- Use selector pattern in components/hooks:
  - Good: `useAuthStore((s) => s.user)`
  - Avoid: destructuring full store object.
- Persist only auth-relevant state (tokens/user) in auth store.
- UI store remains non-persistent.

### 2.6 i18n Rules

- No hardcoded user-facing text in pages/components.
- Use `getTranslations` in server components and `useTranslations` in client components.
- Keep `vi.json` and `en.json` key structure identical.
- Route format is locale-first (`/vi/*`, `/en/*`).

### 2.7 Client/Server Boundaries

- Mark interactive components/hooks with `'use client'`.
- Keep data-only and layout-only pages/components as server components when possible.
- Browser-only logic (localStorage, window events, MSW worker start) must stay in client components.

### 2.8 Import Conventions

- Prefer path alias `@/` for `frontend/src/*`.
- Order imports by category:
  1. External packages
  2. Internal alias imports (`@/...`)
  3. Relative imports
- Keep type imports explicit with `import type` when possible.

### 2.9 Testing/Verification Conventions

- Required checks before merge:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
- For frontend behavior checks with MSW enabled, validate key screens in browser (`/vi`, `/vi/login`, `/vi/register`, `/vi/admin/login`, `/vi/admin/rbac`, `/vi/admin/config`).

### 2.10 Catalog Route Group Pattern

Feature pages that need a **content filter panel** instead of the standard navigation sidebar use a separate `(catalog)` route group.

#### Structure

```
app/[locale]/
├── (app)/          ← standard user surface — auth gate + Navbar only
│   ├── layout.tsx  showSidebar=false
│   └── dashboard/
├── (catalog)/      ← catalog surface — auth gate, NO nav sidebar
│   ├── layout.tsx  showSidebar=false
│   └── quizzes/
│       ├── page.tsx          → QuizCatalogClient
│       └── [id]/page.tsx     → QuizDetailClient
```

#### Rules

- `(catalog)/layout.tsx` renders `UserAccessGate` + `UserLayout` with `showSidebar={false}`.
- Each catalog page client (`*CatalogClient.tsx`) renders its own **two-column layout**:
  ```tsx
  <div className="flex gap-6">
    <div className="hidden w-56 shrink-0 md:block"> {/* filter panel */} </div>
    <section className="min-w-0 flex-1"> {/* content grid */} </section>
  </div>
  ```
- The filter panel is always a sibling of the content grid, **not** injected through the layout hierarchy.
- All filter state lives in the `*CatalogClient` component (`useState`); no URL params, no context needed for MVP.
- Tags/categories for filter options are derived from the already-fetched content list via `useMemo` — no separate filter API call.
- Future catalog pages must follow the same pattern: add a page directory under `(catalog)/`, not under `(app)/`.

#### Why not layout sidebar injection?

Injecting a filter panel through the layout would require prop drilling (`params`-dependent filter options) through server layout files, which is incompatible with Next.js App Router's static layout model. Co-locating the filter panel inside the client component is simpler and avoids RSC/client boundary violations.

### 2.11 FE-BE Contract Baseline (Completed Slices)

- Scope applies to completed slices: Slice 1 (auth backend), Slice 2 (RBAC backend), Slice 3 (system config backend), Slice 4 (frontend foundation), Slices 5–11 (feature surfaces).
- `GET /api/auth/sso/redirect/` is an HTTP redirect endpoint (302), not a JSON payload endpoint; frontend should navigate browser to this URL instead of expecting response body.
- Auth token payload user shape is minimal (`id`, `username`, `email`) for `register/login/sso-callback`.
- `POST /api/auth/identity/link/` returns `{detail, provider, external_id, created}`.
- `GET /api/admin/config/` returns an object grouped by category (`{[category]: SystemConfig[]}`), not a `{groups: [...]}` wrapper.
- Admin RBAC and system config frontend pages are served from dedicated admin surface routes (`/{locale}/admin/*`).
- MSW contract covers all domains via `src/mocks/handlers/index.ts` — see §1.5.

---

## 3. Page Inventory

### 3.1 Status Legend

- `implemented`: Page fully implemented
- `skeleton`: Route file exists with placeholder UI; logic not yet implemented
- `planned`: Defined and scheduled, route file does not exist yet

### 3.2 Surface Overview

| Surface | Audience | Base Path | Entry | Route Group |
|---|---|---|---|---|
| User (auth) | Guests | `/{locale}/(login\|register\|forgot-password\|reset-password)` | `/{locale}/login` | `[locale]/(auth)` |
| User (app shell) | Authenticated | `/{locale}/(dashboard\|profile\|notifications\|leaderboard)` | `/{locale}/dashboard` | `[locale]/(app)` |
| User (catalog) | Authenticated | `/{locale}/(courses\|challenges\|quizzes)` | catalog index | `[locale]/(catalog)` |
| Admin | Admin/Editor | `/{locale}/admin/*` | `/{locale}/admin/login` | `[locale]/(admin)/admin/(protected)` |

---

### 3.3 User Surface — Authentication (unauthenticated)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/` | Root redirect | No | root | none | none | 4 | implemented |
| `/vi` `/en` | Locale home | No | `[locale]` | none | none | 4 | implemented |
| `/vi/login` `/en/login` | Login | No | `[locale]/(auth)` | `auth.store` | `auth.login`, `auth.ssoRedirect` | 4 | implemented |
| `/vi/register` `/en/register` | Register | No | `[locale]/(auth)` | `auth.store` | `auth.register` | 4 | implemented |
| `/vi/forgot-password` `/en/forgot-password` | Forgot password | No | `[locale]/(auth)` | none | `auth.requestPasswordReset` | 1 | skeleton |
| `/vi/reset-password` `/en/reset-password` | Reset password confirm | No | `[locale]/(auth)` | none | `auth.confirmPasswordReset` | 1 | skeleton |

> ⚠️ `/forgot-password` và `/reset-password` phụ thuộc vào Task 1.4 (email backend) hoàn thành.

---

### 3.4 User Surface — General (authenticated)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/dashboard` `/en/dashboard` | Dashboard | Yes | `[locale]/(app)` | `auth.store`, `ui.store` | `users.getMyProfile`, `leaderboard.getLeaderboard` (summary) | 4 | implemented |
| `/vi/notifications` `/en/notifications` | Notification inbox | Yes | `[locale]/(app)` | `notifications.store` | `notifications.listNotifications`, `notifications.markNotificationRead`, `notifications.markAllNotificationsRead`, `notifications.getUnreadNotificationCount`, WS `/ws/notifications/` | 9 | implemented |
| `/vi/leaderboard` `/en/leaderboard` | Leaderboard | Yes | `[locale]/(app)` | `ui.store` | `leaderboard.getLeaderboard` | 11 | implemented |

> **Dashboard content (Slice 11):** quick-stats cards (total points, challenges solved, quizzes completed, courses in progress), mini leaderboard rank, recent activity feed, recommended/incomplete courses.

---

### 3.5 User Surface — Learn

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/courses` `/en/courses` | Course catalog | Yes | `[locale]/(catalog)` | `courses.store` | `courses.listCourses` | 5 | implemented |
| `/vi/courses/[slug]` `/en/courses/[slug]` | Course detail + tree | Yes | `[locale]/(catalog)` | `courses.store` | `courses.getCourseBySlug`, `courses.getCourseNodes`, `courses.getCourseProgress` | 5 | implemented |
| `/vi/courses/[slug]/lessons/[id]` `/en/courses/[slug]/lessons/[id]` | Lesson viewer | Yes | `[locale]/(catalog)` | `courses.store` | `lessons.getLessonById`, `lessons.getLessonQuestions`, `lessons.startProgress`, `lessons.completeProgress` | 5 | implemented |

---

### 3.6 User Surface — Challenge

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/challenges` `/en/challenges` | Challenge catalog | Yes | `[locale]/(catalog)` | `challenges.store` | `challenges.listChallenges` | 6 | implemented |
| `/vi/challenges/[slug]` `/en/challenges/[slug]` | Challenge detail + submit | Yes | `[locale]/(catalog)` | `challenges.store` | `challenges.getChallengeBySlug`, `challenges.submitFlag`, `challenges.getChallengeProgress` | 6 | implemented |

---

### 3.7 User Surface — Quiz

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/quizzes` `/en/quizzes` | Quiz catalog | Yes | `[locale]/(catalog)` | `quizzes.store` | `quizzes.listQuizzes` | 7 | implemented |
| `/vi/quizzes/[id]` `/en/quizzes/[id]` | Quiz detail + config | Yes | `[locale]/(catalog)` | `quizzes.store` | `quizzes.getQuizById`, `quizzes.getMyConfig`, `quizzes.saveConfig`, `quizzes.getMyProgress` | 7 | implemented |
| `/vi/quizzes/[id]/session` `/en/quizzes/[id]/session` | Quiz practice session | Yes | `[locale]/(catalog)` | `quizzes.store` | WS: `ws/quiz/[id]/` (first-message JWT auth) | 7 | implemented |

---

### 3.8 User Surface — Profile

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/profile` `/en/profile` | Profile root (redirect → `/profile/settings`) | Yes | `[locale]/(app)` | none | none | 8 | implemented |
| `/vi/profile/[username]` `/en/profile/[username]` | Public profile | Yes | `[locale]/(app)` | `auth.store` | `users.getPublicProfile`, `users.getPublicActivity` | 8 | implemented |
| `/vi/profile/settings` `/en/profile/settings` | Profile settings | Yes | `[locale]/(app)` | `auth.store` | `users.getMyProfile`, `users.updateMyProfile`, `users.updateMySettings`, `users.updateMyAccount` | 8 | implemented |
| `/vi/profile/sessions` `/en/profile/sessions` | Session management | Yes | `[locale]/(app)` | `auth.store` | `auth.listSessions`, `auth.revokeSession` | 8 | implemented |

---

### 3.9 Admin Surface — Authentication

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin` `/en/admin` | Admin entry redirect | No | `[locale]/(admin)/admin` | `auth.store` | none | 4 | implemented |
| `/vi/admin/login` `/en/admin/login` | Admin login | No | `[locale]/(admin)/admin/(auth)` | `auth.store` | `auth.login` | 4 | implemented |

> Admin entry `/vi/admin` redirects to `/vi/admin/dashboard` when authenticated, else to `/vi/admin/login`.

---

### 3.10 Admin Surface — General (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/dashboard` `/en/admin/dashboard` | Admin dashboard | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `admin.getStats`, `users.listUsers` (summary) | 11 | implemented |
| `/vi/admin/users` `/en/admin/users` | User management | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `users.listUsers`, `users.updateUser`, `users.createUser` | 8 | implemented |
| `/vi/admin/rbac` `/en/admin/rbac` | RBAC overview | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.listRoles`, `rbac.listPermissions`, `rbac.createRole`, `rbac.updateRole`, `rbac.deleteRole` | 2 | implemented |
| `/vi/admin/rbac/roles/[id]` `/en/admin/rbac/roles/[id]` | Role permission assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getRolePermissions`, `rbac.assignPermissionToRole`, `rbac.revokePermissionFromRole` | 2 | implemented |
| `/vi/admin/rbac/users/[id]/roles` `/en/admin/rbac/users/[id]/roles` | User role assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getUserRoles`, `rbac.assignRoleToUser`, `rbac.revokeRoleFromUser` | 2 | implemented |
| `/vi/admin/config` `/en/admin/config` | System config | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` + local feature hook | `systemConfig.listSystemConfigs`, `systemConfig.getSystemConfigByKey`, `systemConfig.updateSystemConfigValue` | 3 | implemented |
| `/vi/admin/notifications` `/en/admin/notifications` | Notification broadcast | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | local feature hook | `notifications.broadcastAdminNotification`, `notifications.listAdminBroadcastHistory` | 9 | implemented |
| `/vi/admin/statistics` `/en/admin/statistics` | Detailed statistics | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `admin.getStats`, `admin.getUserStats` | 11 | implemented |

> **Admin dashboard content:** summary stat cards (total users, active today, solves this week, content counts), quick-links to each management section. Lightweight — does NOT replace `/admin/statistics`.

---

### 3.11 Admin Surface — Learn Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/learn/courses` `/en/admin/learn/courses` | Course list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.listCourses` (all statuses) | 5 | implemented |
| `/vi/admin/learn/courses/new` `/en/admin/learn/courses/new` | Create course | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.createCourse`, `courses.listCategories`, `courses.listTags` | 5 | implemented |
| `/vi/admin/learn/courses/[slug]` `/en/admin/learn/courses/[slug]` | Course editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.getCourse`, `courses.updateCourse`, `courses.getNodes`, `courses.createNode`, `courses.updateNode`, `courses.moveNode`, `courses.deleteNode` | 5 | implemented |
| `/vi/admin/learn/lessons/[id]` `/en/admin/learn/lessons/[id]` | Lesson content editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `lessons.getLesson`, `lessons.updateLesson`, `lessons.syncOutline`, `lessons.getQuestions`, `lessons.addQuestion` | 5 | implemented |

---

### 3.12 Admin Surface — Challenge Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/challenges` `/en/admin/challenges` | Challenge list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.listChallenges` (all statuses) | 6 | implemented |
| `/vi/admin/challenges/new` `/en/admin/challenges/new` | Create challenge | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.createChallenge`, `challenges.listCategories`, `challenges.listTags` | 6 | implemented |
| `/vi/admin/challenges/[slug]` `/en/admin/challenges/[slug]` | Challenge editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.getChallenge`, `challenges.updateChallenge`, `challenges.getNodes`, `challenges.createNode`, `challenges.updateNode`, `challenges.moveNode`, `challenges.syncGitLab` | 6 | implemented |
| `/vi/admin/challenges/[slug]/flags` `/en/admin/challenges/[slug]/flags` | Flag management | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.getFlags`, `challenges.createFlag`, `challenges.updateFlag`, `challenges.deleteFlag` | 6 | implemented |
| `/vi/admin/challenges/instances` `/en/admin/challenges/instances` | Instance management | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.listInstances`, `challenges.killInstance` | 6 | implemented |

---

### 3.13 Admin Surface — Quiz Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/quizzes` `/en/admin/quizzes` | Quiz list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.listQuizzes` (all statuses) | 7 | implemented |
| `/vi/admin/quizzes/new` `/en/admin/quizzes/new` | Create quiz | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.createQuiz`, `quizzes.listCategories`, `quizzes.listTags` | 7 | implemented |
| `/vi/admin/quizzes/[id]` `/en/admin/quizzes/[id]` | Quiz metadata editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.getQuiz`, `quizzes.updateQuiz`, `quizzes.publishQuiz` | 7 | implemented |
| `/vi/admin/quizzes/[id]/questions` `/en/admin/quizzes/[id]/questions` | Question manager | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.getQuestions`, `quizzes.createQuestion`, `quizzes.updateQuestion`, `quizzes.deleteQuestion` | 7 | implemented |

---

### 3.14 App Router — Directory Map

```
frontend/app/
├── layout.tsx                                        # root providers
├── page.tsx                                          # root → /vi redirect
└── [locale]/
    ├── layout.tsx                                    # locale provider
    ├── (auth)/                                       # guest-only (GuestOnlyGate)
    │   ├── layout.tsx                                # centered card layout
    │   ├── login/page.tsx                            ✅ implemented
    │   ├── register/page.tsx                         ✅ implemented
    │   ├── forgot-password/page.tsx                  🔲 skeleton (Task 1.6)
    │   └── reset-password/page.tsx                   🔲 skeleton (Task 1.6)
    ├── (app)/                                        # auth (UserAccessGate), navbar/footer, NO nav sidebar
    │   ├── layout.tsx                                # showSidebar=false — navigation via Navbar only
    │   ├── dashboard/page.tsx                        ✅ implemented (content filled Slice 11)
    │   ├── notifications/page.tsx                    ✅ implemented (Task 9.4)
    │   ├── leaderboard/page.tsx                      ✅ implemented (Task 11.3)
    │   └── profile/
    │       ├── page.tsx                              ✅ implemented (redirect → settings)
    │       ├── [username]/page.tsx                   ✅ implemented (Task 8.3)
    │       ├── settings/page.tsx                     ✅ implemented (Task 8.3)
    │       └── sessions/page.tsx                     ✅ implemented (Task 8.5)
    ├── (catalog)/                                    # auth (UserAccessGate), no nav sidebar; each page renders own filter panel
    │   ├── layout.tsx                                # showSidebar=false
    │   ├── quizzes/
    │   │   ├── page.tsx                              ✅ implemented (Task 7.5)
    │   │   └── [id]/
    │   │       ├── page.tsx                          ✅ implemented (Task 7.5)
    │   │       └── session/page.tsx                  ✅ implemented (Task 7.6)
    │   ├── courses/
    │   │   ├── page.tsx                              ✅ implemented (Task 5.5)
    │   │   └── [slug]/
    │   │       ├── page.tsx                          ✅ implemented (Task 5.5)
    │   │       └── lessons/[id]/page.tsx             ✅ implemented (Task 5.6)
    │   └── challenges/
    │       ├── page.tsx                              ✅ implemented (Task 6.5)
    │       └── [slug]/page.tsx                       ✅ implemented (Task 6.6)
    └── (admin)/admin/
        ├── page.tsx                                  ✅ implemented (redirect)
        ├── (auth)/
        │   ├── layout.tsx                            ✅ implemented
        │   └── login/page.tsx                        ✅ implemented
        └── (protected)/
            ├── layout.tsx                            ✅ implemented (admin shell + access gate)
            ├── dashboard/page.tsx                    ✅ implemented (Task 11.5)
            ├── users/page.tsx                        ✅ implemented (Task 8.4)
            ├── rbac/
            │   ├── page.tsx                          ✅ implemented
            │   ├── roles/[id]/page.tsx               ✅ implemented
            │   └── users/[id]/roles/page.tsx         ✅ implemented
            ├── config/page.tsx                       ✅ implemented
            ├── notifications/page.tsx                ✅ implemented (Task 9.5)
            ├── statistics/page.tsx                   ✅ implemented (Task 11.4)
            ├── learn/
            │   ├── courses/
            │   │   ├── page.tsx                      ✅ implemented (Task 5.7)
            │   │   ├── new/page.tsx                  ✅ implemented (Task 5.7)
            │   │   └── [slug]/page.tsx               ✅ implemented (Task 5.7)
            │   └── lessons/[id]/page.tsx             ✅ implemented (Task 5.7)
            ├── challenges/
            │   ├── page.tsx                          ✅ implemented (Task 6.7)
            │   ├── new/page.tsx                      ✅ implemented (Task 6.7)
            │   ├── [slug]/page.tsx                   ✅ implemented (Task 6.7)
            │   ├── [slug]/flags/page.tsx             ✅ implemented (Task 6.7)
            │   └── instances/page.tsx                ✅ implemented (Task 6.7)
            └── quizzes/
                ├── page.tsx                          ✅ implemented (Task 7.7)
                ├── new/page.tsx                      ✅ implemented (Task 7.7)
                ├── [id]/page.tsx                     ✅ implemented (Task 7.7)
                └── [id]/questions/page.tsx           ✅ implemented (Task 7.7)
```

---

### 3.15 Notes

- Locale-first routing is mandatory for all user-facing pages.
- Service calls listed here must go through `src/services/*` only — no direct Axios calls in components.
- Admin surface is route-isolated from user surface; both share one Next.js app but use dedicated layout groups.
- **Implemented** admin pages cover: RBAC (`/admin/rbac/*`), System Config (`/admin/config`), Users (`/admin/users`), Notifications (`/admin/notifications`), Dashboard (`/admin/dashboard`), Statistics (`/admin/statistics`), Learn (`/admin/learn/*`), Challenges (`/admin/challenges/*`), Quizzes (`/admin/quizzes/*`).
- **Content management pages** (`/admin/learn/*`, `/admin/challenges/*`, `/admin/quizzes/*`) are accessible by both Admin and Editor roles; instance kill and user management require Admin role.
- **Category/Tag management** for each domain is handled inline (via modal or slide-over) within the respective content list page — no separate routes to avoid route explosion.
- **Password reset UI** (`/forgot-password`, `/reset-password`) vẫn phụ thuộc Task 1.4B (email backend) hoàn thành.
- Planned routes align with `docs/IMPL_PLAN.md` slices and API inventory in `docs/API.md`.
