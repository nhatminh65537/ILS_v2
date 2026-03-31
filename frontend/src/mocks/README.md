## `src/mocks/`

Mock Service Worker (MSW) setup for API interception in development.

Directories:
- `handlers/` — HTTP handlers per domain (auth, users, courses, challenges, quizzes, notifications, leaderboard)
- `data/` — Mock data fixtures (realistic UUIDs, ISO dates, relationships)

Files:
- `browser.ts` — MSW worker setup for browser (client-side)
- `server.ts` — MSW server setup for Node.js (testing)

**Rule**: MSW only active when `NEXT_PUBLIC_ENABLE_MSW=true`. Handlers return Stable endpoints only.
