## `src/stores/`

Zustand state management. One store per domain with pub/sub pattern.

Files:
- `auth.store.ts` — User authentication state (user, tokens, isAuthenticated)
- `ui.store.ts` — UI state (sidebar, modals, global loading)
- `courses.store.ts` — Course list/detail state (skeleton for Slice 5)
- `challenges.store.ts` — Challenge list/detail state (skeleton for Slice 6)
- `quizzes.store.ts` — Quiz list/detail state (skeleton for Slice 7)
- `notifications.store.ts` — Notifications state (skeleton for Slice 9)

**Rule**: Use granular selectors, never destructure entire store. Auth store persists to localStorage.
