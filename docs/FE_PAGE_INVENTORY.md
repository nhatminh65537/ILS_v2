# FE_PAGE_INVENTORY.md

## Purpose

Route-level inventory for frontend pages across Slices 1–11.

## Status Legend

- `implemented`: Page exists in codebase now
- `planned`: Defined and scheduled, not implemented yet

## Surface Overview

| Surface | Base Path | Auth Entry | Layout Group |
|---------|-----------|------------|--------------|
| User surface | `/{locale}/*` | `/{locale}/login` | `[locale]/(app)` |
| Admin surface | `/{locale}/admin/*` | `/{locale}/admin/login` | `[locale]/(admin)/admin/(protected)` |

---

## User Surface — Authentication (unauthenticated)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/` | Root redirect | No | root | none | none | 4 | implemented |
| `/vi` `/en` | Locale home | No | `[locale]` | none | none | 4 | implemented |
| `/vi/login` `/en/login` | Login | No | `[locale]/(auth)` | `auth.store` | `auth.login`, `auth.ssoRedirect` | 4 | implemented |
| `/vi/register` `/en/register` | Register | No | `[locale]/(auth)` | `auth.store` | `auth.register` | 4 | implemented |
| `/vi/forgot-password` `/en/forgot-password` | Forgot password | No | `[locale]/(auth)` | none | `auth.requestPasswordReset` | 1 | planned |
| `/vi/reset-password` `/en/reset-password` | Reset password confirm | No | `[locale]/(auth)` | none | `auth.confirmPasswordReset` | 1 | planned |

> ⚠️ `/forgot-password` và `/reset-password` phụ thuộc vào Task 1.4 (email backend) hoàn thành.

---

## User Surface — General (authenticated)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/dashboard` `/en/dashboard` | Dashboard | Yes | `[locale]/(app)` | `auth.store`, `ui.store` | `users.getMyProfile`, `leaderboard.getLeaderboard` (summary) | 4 | implemented |
| `/vi/notifications` `/en/notifications` | Notification inbox | Yes | `[locale]/(app)` | `notifications.store` | `notifications.listNotifications`, `notifications.markRead`, `notifications.markAllRead` | 9 | planned |
| `/vi/leaderboard` `/en/leaderboard` | Leaderboard | Yes | `[locale]/(app)` | `ui.store` | `leaderboard.getLeaderboard` | 11 | planned |

> **Dashboard content (Slice 11):** quick-stats cards (total points, challenges solved, quizzes completed, courses in progress), mini leaderboard rank, recent activity feed, recommended/incomplete courses.

---

## User Surface — Learn

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/courses` `/en/courses` | Course catalog | Yes | `[locale]/(app)` | `courses.store` | `courses.listCourses` | 5 | planned |
| `/vi/courses/[slug]` `/en/courses/[slug]` | Course detail + tree | Yes | `[locale]/(app)` | `courses.store` | `courses.getCourseBySlug`, `courses.getCourseNodes`, `courses.getCourseProgress` | 5 | planned |
| `/vi/courses/[slug]/lessons/[id]` `/en/courses/[slug]/lessons/[id]` | Lesson viewer | Yes | `[locale]/(app)` | `courses.store` | `lessons.getLessonById`, `lessons.startProgress`, `lessons.completeProgress` | 5 | planned |

---

## User Surface — Challenge

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/challenges` `/en/challenges` | Challenge catalog | Yes | `[locale]/(app)` | `challenges.store` | `challenges.listChallenges` | 6 | planned |
| `/vi/challenges/[slug]` `/en/challenges/[slug]` | Challenge detail + submit | Yes | `[locale]/(app)` | `challenges.store` | `challenges.getChallengeBySlug`, `challenges.submitFlag`, `challenges.getChallengeProgress` | 6 | planned |

---

## User Surface — Quiz

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/quizzes` `/en/quizzes` | Quiz catalog | Yes | `[locale]/(app)` | `quizzes.store` | `quizzes.listQuizzes` | 7 | planned |
| `/vi/quizzes/[id]` `/en/quizzes/[id]` | Quiz detail + config | Yes | `[locale]/(app)` | `quizzes.store` | `quizzes.getQuizById`, `quizzes.getMyConfig`, `quizzes.saveConfig`, `quizzes.getMyProgress` | 7 | planned |
| `/vi/quizzes/[id]/session` `/en/quizzes/[id]/session` | Quiz practice session | Yes | `[locale]/(app)` | `quizzes.store` | WS: `ws/quiz/[id]/` (first-message JWT auth) | 7 | planned |

---

## User Surface — Profile

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/profile/[username]` `/en/profile/[username]` | Public profile | Yes | `[locale]/(app)` | `auth.store` | `users.getUserProfile`, `users.getUserActivity` | 8 | planned |
| `/vi/profile/settings` `/en/profile/settings` | Profile settings | Yes | `[locale]/(app)` | `auth.store` | `users.getMyProfile`, `users.updateMyProfile`, `users.changePassword`, `auth.linkIdentity` | 8 | planned |
| `/vi/profile/sessions` `/en/profile/sessions` | Session management | Yes | `[locale]/(app)` | `auth.store` | `auth.listSessions`, `auth.revokeSession` | 1 | planned |

> ⚠️ `/profile/sessions` phụ thuộc vào Task 1.4 (session management API) hoàn thành.

---

## Admin Surface — Authentication

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin` `/en/admin` | Admin entry redirect | No | `[locale]/(admin)/admin` | `auth.store` | none | 4 | implemented |
| `/vi/admin/login` `/en/admin/login` | Admin login | No | `[locale]/(admin)/admin/(auth)` | `auth.store` | `auth.login` | 4 | implemented |

> Admin entry `/vi/admin` redirects to `/vi/admin/dashboard` when authenticated, else to `/vi/admin/login`.

---

## Admin Surface — General (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/dashboard` `/en/admin/dashboard` | Admin dashboard | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `admin.getStats`, `users.listUsers` (summary) | 11 | planned |
| `/vi/admin/users` `/en/admin/users` | User management | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `users.listUsers`, `users.updateUser`, `users.createUser` | 8 | planned |
| `/vi/admin/rbac` `/en/admin/rbac` | RBAC overview | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.listRoles`, `rbac.listPermissions`, `rbac.createRole`, `rbac.updateRole`, `rbac.deleteRole` | 2 | implemented |
| `/vi/admin/rbac/roles/[id]` `/en/admin/rbac/roles/[id]` | Role permission assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getRolePermissions`, `rbac.assignPermissionToRole`, `rbac.revokePermissionFromRole` | 2 | implemented |
| `/vi/admin/rbac/users/[id]/roles` `/en/admin/rbac/users/[id]/roles` | User role assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getUserRoles`, `rbac.assignRoleToUser`, `rbac.revokeRoleFromUser` | 2 | implemented |
| `/vi/admin/config` `/en/admin/config` | System config | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` + local feature hook | `systemConfig.listSystemConfigs`, `systemConfig.getSystemConfigByKey`, `systemConfig.updateSystemConfigValue` | 3 | implemented |
| `/vi/admin/notifications` `/en/admin/notifications` | Notification broadcast | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `notifications.store` | `notifications.broadcast`, `notifications.listBroadcast` | 9 | planned |
| `/vi/admin/statistics` `/en/admin/statistics` | Detailed statistics | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `ui.store` | `admin.getStats`, `admin.getUserStats` | 11 | planned |

> **Admin dashboard content:** summary stat cards (total users, active today, solves this week, content counts), quick-links to each management section. Lightweight — does NOT replace `/admin/statistics`.

---

## Admin Surface — Learn Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/learn/courses` `/en/admin/learn/courses` | Course list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.listCourses` (all statuses) | 5 | planned |
| `/vi/admin/learn/courses/new` `/en/admin/learn/courses/new` | Create course | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.createCourse`, `courses.listCategories`, `courses.listTags` | 5 | planned |
| `/vi/admin/learn/courses/[slug]` `/en/admin/learn/courses/[slug]` | Course editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `courses.getCourse`, `courses.updateCourse`, `courses.getNodes`, `courses.createNode`, `courses.updateNode`, `courses.moveNode`, `courses.deleteNode` | 5 | planned |
| `/vi/admin/learn/lessons/[id]` `/en/admin/learn/lessons/[id]` | Lesson content editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `courses.store` | `lessons.getLesson`, `lessons.updateLesson`, `lessons.syncOutline`, `lessons.getQuestions`, `lessons.addQuestion` | 5 | planned |

---

## Admin Surface — Challenge Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/challenges` `/en/admin/challenges` | Challenge list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.listChallenges` (all statuses) | 6 | planned |
| `/vi/admin/challenges/new` `/en/admin/challenges/new` | Create challenge | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.createChallenge`, `challenges.listCategories`, `challenges.listTags` | 6 | planned |
| `/vi/admin/challenges/[slug]` `/en/admin/challenges/[slug]` | Challenge editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.getChallenge`, `challenges.updateChallenge`, `challenges.getNodes`, `challenges.createNode`, `challenges.updateNode`, `challenges.moveNode`, `challenges.syncGitLab` | 6 | planned |
| `/vi/admin/challenges/[slug]/flags` `/en/admin/challenges/[slug]/flags` | Flag management | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.getFlags`, `challenges.createFlag`, `challenges.updateFlag`, `challenges.deleteFlag` | 6 | planned |
| `/vi/admin/challenges/instances` `/en/admin/challenges/instances` | Instance management | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `challenges.store` | `challenges.listInstances`, `challenges.killInstance` | 6 | planned |

---

## Admin Surface — Quiz Content Management (Admin + Editor)

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/vi/admin/quizzes` `/en/admin/quizzes` | Quiz list (editor) | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.listQuizzes` (all statuses) | 7 | planned |
| `/vi/admin/quizzes/new` `/en/admin/quizzes/new` | Create quiz | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.createQuiz`, `quizzes.listCategories`, `quizzes.listTags` | 7 | planned |
| `/vi/admin/quizzes/[id]` `/en/admin/quizzes/[id]` | Quiz metadata editor | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.getQuiz`, `quizzes.updateQuiz`, `quizzes.publishQuiz` | 7 | planned |
| `/vi/admin/quizzes/[id]/questions` `/en/admin/quizzes/[id]/questions` | Question manager | Yes (Admin/Editor) | `[locale]/(admin)/admin/(protected)` | `quizzes.store` | `quizzes.getQuestions`, `quizzes.createQuestion`, `quizzes.updateQuestion`, `quizzes.deleteQuestion` | 7 | planned |

---

## App Router — Directory Map

```
frontend/app/
├── layout.tsx                                        # root providers
├── page.tsx                                          # root → /vi redirect
└── [locale]/
    ├── layout.tsx                                    # locale provider
    ├── (auth)/
    │   ├── layout.tsx                                # centered card layout
    │   ├── login/page.tsx                            ✅ implemented
    │   ├── register/page.tsx                         ✅ implemented
    │   ├── forgot-password/page.tsx                  planned (Task 1.6)
    │   └── reset-password/page.tsx                   planned (Task 1.6)
    ├── (app)/
    │   ├── layout.tsx                                # user shell (navbar/sidebar/footer)
    │   ├── dashboard/page.tsx                        ✅ implemented (content filled Slice 11)
    │   ├── courses/
    │   │   ├── page.tsx                              planned (Task 5.5)
    │   │   └── [slug]/
    │   │       ├── page.tsx                          planned (Task 5.5)
    │   │       └── lessons/[id]/page.tsx             planned (Task 5.6)
    │   ├── challenges/
    │   │   ├── page.tsx                              planned (Task 6.5)
    │   │   └── [slug]/page.tsx                       planned (Task 6.6)
    │   ├── quizzes/
    │   │   ├── page.tsx                              planned (Task 7.5)
    │   │   ├── [id]/page.tsx                         planned (Task 7.5)
    │   │   └── [id]/session/page.tsx                 planned (Task 7.6)
    │   ├── profile/
    │   │   ├── [username]/page.tsx                   planned (Task 8.3)
    │   │   ├── settings/page.tsx                     planned (Task 8.3)
    │   │   └── sessions/page.tsx                     planned (Task 8.5)
    │   ├── notifications/page.tsx                    planned (Task 9.4)
    │   └── leaderboard/page.tsx                      planned (Task 11.3)
    └── (admin)/admin/
        ├── page.tsx                                  ✅ implemented (redirect)
        ├── (auth)/
        │   ├── layout.tsx                            ✅ implemented
        │   └── login/page.tsx                        ✅ implemented
        └── (protected)/
            ├── layout.tsx                            ✅ implemented (admin shell + access gate)
            ├── dashboard/page.tsx                    planned (Task 11.5)
            ├── users/page.tsx                        planned (Task 8.4)
            ├── rbac/
            │   ├── page.tsx                          ✅ implemented
            │   ├── roles/[id]/page.tsx               ✅ implemented
            │   └── users/[id]/roles/page.tsx         ✅ implemented
            ├── config/page.tsx                       ✅ implemented
            ├── notifications/page.tsx                planned (Task 9.5)
            ├── statistics/page.tsx                   planned (Task 11.4)
            ├── learn/
            │   ├── courses/
            │   │   ├── page.tsx                      planned (Task 5.7)
            │   │   ├── new/page.tsx                  planned (Task 5.7)
            │   │   └── [slug]/page.tsx               planned (Task 5.7)
            │   └── lessons/[id]/page.tsx             planned (Task 5.7)
            ├── challenges/
            │   ├── page.tsx                          planned (Task 6.7)
            │   ├── new/page.tsx                      planned (Task 6.7)
            │   ├── [slug]/page.tsx                   planned (Task 6.7)
            │   ├── [slug]/flags/page.tsx             planned (Task 6.7)
            │   └── instances/page.tsx               planned (Task 6.7)
            └── quizzes/
                ├── page.tsx                          planned (Task 7.7)
                ├── new/page.tsx                      planned (Task 7.7)
                ├── [id]/page.tsx                     planned (Task 7.7)
                └── [id]/questions/page.tsx           planned (Task 7.7)
```

---

## Notes

- Locale-first routing is mandatory for all user-facing pages.
- Service calls listed here must go through `src/services/*` only — no direct Axios calls in components.
- Admin surface is route-isolated from user surface; both share one Next.js app but use dedicated layout groups.
- **Implemented** admin pages: RBAC (`/admin/rbac/*`) and System Config (`/admin/config`). All remaining admin pages are `planned`.
- **Content management pages** (`/admin/learn/*`, `/admin/challenges/*`, `/admin/quizzes/*`) are accessible by both Admin and Editor roles; instance kill and user management require Admin role.
- **Category/Tag management** for each domain is handled inline (via modal or slide-over) within the respective content list page — no separate routes to avoid route explosion.
- **Password reset UI** (`/forgot-password`, `/reset-password`) and **session management** (`/profile/sessions`) depend on Task 1.4 (email backend + session API) being completed first.
- Planned routes align with `docs/IMPL_PLAN.md` slices and API inventory in `docs/API.md`.
