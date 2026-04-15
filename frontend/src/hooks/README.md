## `src/hooks/`

Custom React hooks for common patterns.

Files:
- `useAuth.ts` — Auth state + actions wrapper (user, login, logout)
- `useApi.ts` — Generic data fetching hook (loading, error, refetch, abort on unmount)
- `useQuizzes.ts` — Quiz catalog/detail data orchestration
- `useQuizSession.ts` — WebSocket quiz session orchestration
- `useCourses.ts` — Learn course catalog + lazy tree data orchestration
- `useAdminQuizzes.ts`, `useAdminQuizQuestions.ts`, `useAdminUsers.ts`, `useRbac.ts`, `useSystemConfig.ts` — admin domain hooks

**Rule**: UI components must use domain hooks and service layer methods; do not call Axios directly inside components.
