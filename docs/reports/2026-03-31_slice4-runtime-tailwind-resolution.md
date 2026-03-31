# 2026-03-31 - Slice 4 Runtime Tailwind Resolution

## Context

During frontend runtime validation after Slice 4 foundation rollout, development servers intermittently failed while loading localized routes (`/vi`, `/vi/login`).

Observed runtime symptom:

- Module resolution error during page compile:
  - `Error: Can't resolve 'tailwindcss' in 'D:\\PBL5\\ILS_v2'`

## Root Cause

The global stylesheet included an additional shadcn package-level import that was not required for this setup:

- `@import "shadcn/tailwind.css";`

Under the active runtime/tooling path, this contributed to inconsistent Tailwind resolution behavior against workspace root instead of frontend package scope.

## Fix Applied

Updated global CSS and removed the unnecessary import:

- file: `frontend/app/globals.css`
- change: removed `@import "shadcn/tailwind.css";`

Kept only the required imports:

- `@import "tailwindcss";`
- `@import "tw-animate-css";`

## Verification

- Production build check:
  - command: `npm run build`
  - result: success (compiled, type check passed, pages generated)

Build output confirms locale routes and proxy are generated correctly:

- `/[locale]` (`/vi`, `/en`)
- `/[locale]/login`
- `/[locale]/register`
- dynamic `/[locale]/dashboard`
- proxy middleware active

## Impact

- Runtime stability improved for localized route compilation.
- No API/service/store contracts changed.
- No backend impact.
