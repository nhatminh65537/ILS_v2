## `src/hooks/`

Custom React hooks for common patterns.

Files:
- `useAuth.ts` — Auth state + actions wrapper (user, login, logout)
- `useApi.ts` — Generic data fetching hook (loading, error, refetch, abort on unmount)

**Rule**: All data fetching goes through useApi for consistency. Auth operations via useAuth hook.
