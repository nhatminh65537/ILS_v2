## `src/mocks/handlers/`

MSW request handlers per domain. Each handler matches endpoint pattern and returns mock response.

Files:
- `index.ts` — Export all handlers for browser/server setup
- `auth.handlers.ts` — POST /api/auth/* handlers
- `users.handlers.ts` — GET/POST /api/users/* handlers
- `courses.handlers.ts` — All /api/courses/* handlers
- `challenges.handlers.ts` — All /api/challenges/* handlers
- `quizzes.handlers.ts` — All /api/quizzes/* handlers
- `notifications.handlers.ts` — All /api/notifications/* handlers
- `leaderboard.handlers.ts` — GET /api/leaderboard/ handler

**Rule**: Return realistic data with UUIDs, ISO timestamps, and correct schema matching API.md.
