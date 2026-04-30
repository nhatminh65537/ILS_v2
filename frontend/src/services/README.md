## `src/services/`

Strongly-typed API service layer. Each service file wraps domain endpoints via Axios instance with full type safety.

Files:
- `auth.service.ts` — Authentication (register, login, logout, SSO, token refresh)
- `users.service.ts` — User CRUD and profile management
- `courses.service.ts` — Canonical Learn routes (`/api/learn/courses/*`, lazy tree, progress)
- `lessons.service.ts` — Canonical Learn lesson routes (`/api/learn/lessons/*`, miniquiz mappings, start/complete progress)
- `challenges.service.ts` — Challenge CRUD, flag submission, instances, progress
- `quizzes.service.ts` — Quiz CRUD, attempts, Q&A submission, progress
- `notifications.service.ts` — Notification listing, reading, marking
- `leaderboard.service.ts` — Leaderboard queries (`/api/stats/leaderboard/` canonical)

**Rule**: Never call axios directly in components. Always use service functions. Errors handled via axios interceptor.
