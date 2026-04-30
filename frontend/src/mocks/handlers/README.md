## `src/mocks/handlers/`

MSW request handlers per domain. Each handler matches endpoint pattern and returns mock response.

Files:
- `index.ts` — Export all handlers for browser/server setup
- `auth.handlers.ts` — Auth handlers (`/api/auth/*`) with JWT-like claims in mock access tokens
- `admin-permissions.ts` — Shared admin permission catalog + bitmap token helpers
- `rbac.handlers.ts` — RBAC handlers (`/api/admin/permissions/*`, `/api/admin/roles/*`, `/api/users/{id}/roles/*`)
- `system-config.handlers.ts` — System config handlers (`/api/admin/config/*`)
- `users.handlers.ts` — GET/POST /api/users/* handlers
- `courses.handlers.ts` — All /api/courses/* handlers
- `challenges.handlers.ts` — All /api/challenges/* handlers
- `quizzes.handlers.ts` — All /api/quizzes/* handlers
- `notifications.handlers.ts` — All /api/notifications/* handlers
- `leaderboard.handlers.ts` — GET /api/stats/leaderboard/ handler

**Rule**: Return realistic data with UUIDs, ISO timestamps, and correct schema matching API.md.
