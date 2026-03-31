## `src/types/`

TypeScript domain and API types. All types are derived from backend `docs/API.md` and `docs/DATA_MODEL.md`.

Files:
- `api.ts` — Generic API wrappers (PaginatedResponse, ApiResponse, ApiError)
- `user.types.ts` — User, UserProfile, UserIdentity, UserSession, auth payloads
- `course.types.ts` — Course, Lesson, Progress, tree nodes, and course payloads
- `challenge.types.ts` — Challenge, Flags, Progress, submissions, instances
- `quiz.types.ts` — Quiz, Questions, Attempts, Answers, progress
- `notification.types.ts` — Notifications and payloads
- `leaderboard.types.ts` — Leaderboard entries and filters
- `admin.types.ts` — SystemConfig and settings types

**Rule**: Never use `any` type. All TypeScript strict mode enabled.
