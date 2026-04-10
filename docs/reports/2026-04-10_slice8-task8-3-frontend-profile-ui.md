# Session Report: Slice 8 Task 8.3 — Frontend Profile & Settings Pages

**Date:** 2026-04-10
**Slices / Areas:** Slice 8 – User Profile (Task 8.3 Frontend)

## Summary

Implemented the complete frontend for Slice 8 Task 8.3: two new user-surface pages (`/profile/[username]` and `/profile/settings`), wired to the Task 8.1 backend APIs. The existing `/profile` placeholder was converted to a server-side redirect. The service layer was updated to match the canonical Task 8.1 endpoint paths, new TypeScript types were added, MSW mock coverage was extended for all new endpoints, and i18n keys were added for both locales. Navigation was integrated into the avatar dropdown (GitHub/GitLab pattern: "Hồ sơ" → public profile, "Cài đặt" → settings) and the user sidebar.

## Completed Items

- Fixed stale service routes: `/api/users/profile/` → `/api/users/me/profile/`; `/api/users/update_profile/` → `/api/users/me/profile/` (PATCH)
- Added 5 new service functions: `getMyActivity`, `updateMySettings`, `updateMyAccount`, `getPublicProfile`, `getPublicActivity`
- Added new TypeScript types: `ActivityEvent`, `PublicProfileResponse`, `MeSettingsUpdatePayload`, `MeAccountUpdatePayload`
- Added `activityFixture` (10 entries, mixed types) to MSW fixtures
- Replaced and extended `usersHandlers` with 7 new endpoint mocks; fixed handler ordering so `me/*` and `:username/profile` precede wildcard `/:id/`
- Added `profile` i18n namespace (~35 keys) to `vi.json` and `en.json`; added `navigation.settings` key
- Built 8 feature components under `src/components/features/profile/`: `ProfileHeader`, `ProfileStats`, `ActivityTimeline`, `ProfileEditForm`, `AppSettingsForm` (shadcn Select), `AccountForm`, `PublicProfileView`, `ProfileSettingsView`
- Created `app/[locale]/(app)/profile/[username]/page.tsx` (public profile page)
- Created `app/[locale]/(app)/profile/settings/page.tsx` (settings page)
- Converted `app/[locale]/(app)/profile/page.tsx` from placeholder to `redirect(/${locale}/profile/settings)`
- Updated `UserLayout` to expose `profileLabel`/`quizzesLabel` props; profile in sidebar only (not top navbar)
- Updated `SessionNavControls` avatar dropdown: "Hồ sơ" (public profile) + "Cài đặt" (settings) + separator + logout
- `tsc --noEmit` zero errors; new files lint-clean; `npm run build` successful (26 pages)

## Key Implementations

### MSW Handler Ordering — `me/*` before `/:id/`

1. MSW matches handlers in registration order; `*/api/users/:id/` would capture `me` as a numeric ID string.
2. All `/me/*` handlers and `/:username/profile` handlers are registered first in the array.
3. Generic list/CRUD handlers (`GET /api/users/`, `GET /api/users/:id/`) follow at the end.
4. `parseNumericId()` already guards against non-numeric IDs in the existing `/:id/` handler, providing a secondary safety net.

### `me/account` Returns `User`, Not `UserProfile`

1. `PATCH /api/users/me/account/` calls `MeAccountUpdateSerializer` on `User` model and returns `UserSerializer(request.user).data`.
2. Response shape is `User` (id, username, email, is_active…), not `UserProfile`.
3. `AccountForm.tsx` accepts this and exposes an `onAccountUpdated(user: User)` callback so parents can sync state if needed.
4. Server-side uniqueness errors for `username` and `email` are extracted from `response.data` and shown inline.

### Public Profile vs Own Settings — UX Split

1. Avatar dropdown follows the GitHub/GitLab pattern: "Hồ sơ" links to `/profile/{username}` (public view), "Cài đặt" links to `/profile/settings`.
2. Profile link removed from top navbar; kept in sidebar only to reduce nav clutter.
3. `/profile` page redirects server-side via Next.js `redirect()` to avoid a client-side flash.

### Password Change / SSO Sections — Deferred Placeholders

1. `ProfileSettingsView` renders password-change and SSO cards with `opacity-60` and a `CardDescription` noting "available in a future update".
2. No API calls are wired to these sections; they are purely informational.
3. Task 1.4 (session/password API) must be completed before activating them.

## Files Changed

| File | Change Summary |
|------|---------------|
| `frontend/src/services/users.service.ts` | Fixed 2 stale routes; added `getMyActivity`, `updateMySettings`, `updateMyAccount`, `getPublicProfile`, `getPublicActivity` |
| `frontend/src/types/user.types.ts` | Added `ActivityEvent`, `PublicProfileResponse`, `MeSettingsUpdatePayload`, `MeAccountUpdatePayload`; added `entry_year` to `UpdateProfilePayload` |
| `frontend/src/mocks/data/fixtures.ts` | Added `activityFixture` (10 mixed activity events) |
| `frontend/src/mocks/handlers/users.handlers.ts` | Replaced stale handlers; added 7 new handlers with correct ordering |
| `frontend/messages/vi.json` | Added `profile` namespace; added `navigation.settings` |
| `frontend/messages/en.json` | Mirrored `profile` namespace; added `navigation.settings` |
| `frontend/src/components/features/profile/ProfileHeader.tsx` | NEW — avatar + display_name + bio + location/website |
| `frontend/src/components/features/profile/ProfileStats.tsx` | NEW — 6 stat cards |
| `frontend/src/components/features/profile/ActivityTimeline.tsx` | NEW — timestamped events with type icons and relative time |
| `frontend/src/components/features/profile/ProfileEditForm.tsx` | NEW — PATCH `/me/profile/` form |
| `frontend/src/components/features/profile/AppSettingsForm.tsx` | NEW — PATCH `/me/settings/` with shadcn Select |
| `frontend/src/components/features/profile/AccountForm.tsx` | NEW — PATCH `/me/account/` with server-error extraction |
| `frontend/src/components/features/profile/PublicProfileView.tsx` | NEW — client orchestrator for public profile |
| `frontend/src/components/features/profile/ProfileSettingsView.tsx` | NEW — client orchestrator for settings with deferred placeholders |
| `frontend/app/[locale]/(app)/profile/[username]/page.tsx` | NEW — public profile page |
| `frontend/app/[locale]/(app)/profile/settings/page.tsx` | NEW — settings page |
| `frontend/app/[locale]/(app)/profile/page.tsx` | MODIFIED — placeholder → `redirect(/${locale}/profile/settings)` |
| `frontend/app/[locale]/(app)/layout.tsx` | Added `profileLabel` prop to `UserLayout` |
| `frontend/app/[locale]/page.tsx` | Added `profileLabel` prop to `UserLayout` |
| `frontend/src/components/layouts/UserLayout.tsx` | Added `profileLabel`, `quizzesLabel` props; profile in sidebar only |
| `frontend/src/components/layouts/SessionNavControls.tsx` | Dropdown: "Hồ sơ" + "Cài đặt" + separator + logout |

## Notes / Caveats

- **Password change**: Disabled placeholder. Activating requires Task 1.4 (`GET/POST /api/auth/sessions/`, password-change endpoint).
- **SSO identity management**: Disabled placeholder. Deferred per IMPL_PLAN.md.
- **`/profile/sessions`**: Not implemented in this task — depends on Task 1.4 (Task 8.5 in IMPL_PLAN).
- **Admin user management UI** (Task 8.4): Not in scope for this task; still pending.
- **Relative time in `ActivityTimeline`**: formatted in Vietnamese hardcoded for now (e.g., "3 ngày trước"). Full locale-aware formatting is deferred.
