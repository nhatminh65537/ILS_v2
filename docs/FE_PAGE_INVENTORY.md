# FE_PAGE_INVENTORY.md

## Purpose

Route-level inventory for frontend pages across Slices 4–11.

## Status Legend

- `implemented`: Page exists in codebase now
- `planned`: Defined and scheduled, not implemented yet

## Page Inventory

| Route | Page Name | Auth Required | Layout Group | Primary Store | Primary API Calls | Slice | Status |
|---|---|---|---|---|---|---|---|
| `/` | Root redirect | No | root | none | none | 4 | implemented |
| `/vi` `/en` | Locale home | No | `[locale]` | none | none | 4 | implemented |
| `/vi/login` `/en/login` | Login | No | `[locale]/(auth)` | `auth.store` | `auth.login`, `auth.ssoRedirect` | 4 | implemented |
| `/vi/register` `/en/register` | Register | No | `[locale]/(auth)` | `auth.store` | `auth.register` | 4 | implemented |
| `/vi/dashboard` `/en/dashboard` | Dashboard | Yes | `[locale]/(app)` | `auth.store`, `ui.store` | none (static foundation UI) | 4 | implemented |
| `/vi/admin` `/en/admin` | Admin entry redirect | No | `[locale]/(admin)/admin` | `auth.store` | none | 4 | implemented |
| `/vi/admin/login` `/en/admin/login` | Admin login | No | `[locale]/(admin)/admin/(auth)` | `auth.store` | `auth.login` | 4 | implemented |
| `/vi/courses` `/en/courses` | Course catalog | Yes | `[locale]/(app)` | `courses.store` | `courses.listCourses` | 5 | planned |
| `/vi/courses/[id]` `/en/courses/[id]` | Course detail | Yes | `[locale]/(app)` | `courses.store` | `courses.getCourseById`, `courses.getCourseTree`, `courses.getCourseProgress` | 5 | planned |
| `/vi/lessons/[id]` `/en/lessons/[id]` | Lesson viewer | Yes | `[locale]/(app)` | `courses.store` | `lessons.getLessonById` (planned) | 5 | planned |
| `/vi/challenges` `/en/challenges` | Challenge list/tree | Yes | `[locale]/(app)` | `challenges.store` | `challenges.listChallenges` | 6 | planned |
| `/vi/challenges/[id]` `/en/challenges/[id]` | Challenge detail | Yes | `[locale]/(app)` | `challenges.store` | `challenges.getChallengeById`, `challenges.submitFlag`, `challenges.getChallengeProgress` | 6 | planned |
| `/vi/quizzes` `/en/quizzes` | Quiz catalog | Yes | `[locale]/(app)` | `quizzes.store` | `quizzes.listQuizzes` | 7 | planned |
| `/vi/quizzes/[id]` `/en/quizzes/[id]` | Quiz detail/start | Yes | `[locale]/(app)` | `quizzes.store` | `quizzes.getQuizById`, `quizzes.startQuizAttempt` | 7 | planned |
| `/vi/quizzes/attempt/[attemptId]` `/en/quizzes/attempt/[attemptId]` | Quiz session | Yes | `[locale]/(app)` | `quizzes.store` | `quizzes.submitQuizAnswer` or WS endpoint | 7 | planned |
| `/vi/profile` `/en/profile` | User profile | Yes | `[locale]/(app)` | `auth.store` | `users.getMyProfile`, `users.updateMyProfile` | 8 | planned |
| `/vi/admin/rbac` `/en/admin/rbac` | Admin RBAC overview | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.listRoles`, `rbac.listPermissions`, `rbac.createRole`, `rbac.updateRole`, `rbac.deleteRole` | 2 | implemented |
| `/vi/admin/rbac/roles/[id]` `/en/admin/rbac/roles/[id]` | Admin role permission assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getRolePermissions`, `rbac.assignPermissionToRole`, `rbac.revokePermissionFromRole` | 2 | implemented |
| `/vi/admin/rbac/users/[id]/roles` `/en/admin/rbac/users/[id]/roles` | Admin user role assignment | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` | `rbac.getUserRoles`, `rbac.assignRoleToUser`, `rbac.revokeRoleFromUser` | 2 | implemented |
| `/vi/admin/users` `/en/admin/users` | Admin users | Yes (Admin/Editor) | `[locale]/(app)` | `ui.store` | `users.listUsers`, `users.updateUser` | 8 | planned |
| `/vi/notifications` `/en/notifications` | Notification inbox | Yes | `[locale]/(app)` | `notifications.store` | `notifications.listNotifications`, `notifications.markRead`, `notifications.markAllRead` | 9 | planned |
| `/vi/admin/config` `/en/admin/config` | System config admin | Yes (Admin) | `[locale]/(admin)/admin/(protected)` | `auth.store` + local feature hook | `systemConfig.listSystemConfigs`, `systemConfig.getSystemConfigByKey`, `systemConfig.updateSystemConfigValue` | 3 | implemented |
| `/vi/leaderboard` `/en/leaderboard` | Leaderboard | Yes | `[locale]/(app)` | `ui.store` | `leaderboard.getLeaderboard` | 11 | planned |
| `/vi/admin/statistics` `/en/admin/statistics` | Admin statistics | Yes (Admin) | `[locale]/(app)` | `ui.store` | statistics APIs (planned) | 11 | planned |

## Notes

- Locale-first routing is mandatory for all user-facing pages.
- Service calls listed here must go through `src/services/*` only.
- Planned routes align with `docs/IMPL_PLAN.md` slices and API inventory in `docs/API.md`.
- Admin surface is route-isolated from user surface while keeping development paths under `/{locale}/admin/*`.
- Backend RBAC APIs, admin RBAC frontend pages, and system config frontend page are implemented; remaining admin pages (users/statistics) follow their slice delivery status.
