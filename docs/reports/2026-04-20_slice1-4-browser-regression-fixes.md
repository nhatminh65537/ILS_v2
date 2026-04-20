# Session Report: Slice 1-4 Browser Regression Fixes

**Date:** 2026-04-20
**Slices / Areas:** Slice 1 / Slice 2 / Slice 3 / Slice 4 / Browser regression fix

## Summary

Closed the remaining Slice 1-4 browser regressions against the real backend. The main issues were unstable frontend runtime selection for Playwright, admin-route hydration redirecting valid admin-surface users away from protected routes, stale browser tests using outdated credentials/selectors, and missing deterministic non-editable config seed data for Slice 3 acceptance coverage.

## Completed Items

- Added stable frontend runtime guidance for browser validation: `npm run build` + `npm run start`.
- Fixed admin access gate hydration so direct navigation to protected admin routes keeps valid admin/editor sessions on the requested page.
- Updated browser integration/checklist tests to use deterministic credentials and more stable route/selector handling.
- Restored deterministic non-editable system-config coverage by seeding `challenge.upload_path` with `is_editable=false`.
- Updated Slice 1-4 browser checklist documentation with final PASS results and stable execution notes.
- Synced `docs/STATUS.md` and `openmemory.md` with the regression-fix outcome.

## Key Implementations

### Admin Surface Route Hydration Fix

1. `AdminAccessGate` no longer marks itself ready before persisted auth state is synchronized.
2. Direct navigation to `/vi/admin/rbac` and `/vi/admin/config` now preserves valid admin/editor access.
3. Member users still fail the admin-surface gate and are redirected away from admin routes.

### Stable Browser Validation Path

1. Browser validation now uses real backend wiring through `frontend/.env.local`.
2. Playwright runs against `npm run build` + `npm run start` instead of `next dev`.
3. This removed the earlier `ERR_ABORTED` / detached-frame instability seen during dev-server execution.

### Deterministic System Config Read-only Coverage

1. Slice 3 acceptance requires at least one `is_editable=false` config row.
2. Canonical config seed now sets `challenge.upload_path` as non-editable.
3. Browser verification confirms the UI shows the read-only badge and hides the edit action for that row.

## Verification

- `python manage.py seed_config`
- `npx playwright test playwright.slice1-4.checklist.test.ts --workers=1 --reporter=line`
- `npx playwright test playwright.integration.test.ts playwright.slice1-4.checklist.test.ts --workers=1 --reporter=line`

Result:

- Slice 1-4 checklist browser file: `13 passed`
- Combined integration + checklist run: `22 passed`

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/api/management/commands/seed_config.py` | Seeded `challenge.upload_path` as `is_editable=false` for deterministic Slice 3 read-only coverage. |
| `frontend/src/components/layouts/AdminAccessGate.tsx` | Fixed hydration/ready timing so admin-surface users keep access on direct protected-route navigation. |
| `frontend/playwright.integration.test.ts` | Updated credentials and stabilized integration assertions for real backend browser runs. |
| `frontend/playwright.slice1-4.checklist.test.ts` | Updated credentials, waits, and selectors to match the current Slice 1-4 contract. |
| `docs/intests/2026-04-17_slice1-4-integration-browser-checklist.md` | Marked final PASS results and added 2026-04-20 stable-runtime execution notes. |
| `docs/STATUS.md` | Added regression-fix completion note and report evidence link. |
| `openmemory.md` | Recorded the stable browser-validation pattern and Slice 1-4 regression-fix outcome. |

## Notes / Caveats

- `frontend/.env.local` was required locally for real-backend browser validation, but it is environment-specific and not part of the tracked report payload.
- `frontend/test-results/` contains generated Playwright artifacts from validation runs and is not part of the intended source changes.
