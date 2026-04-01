# Session Report: Slice 3 Task 3.2 - System Config Admin UI

**Date:** 2026-04-01
**Slices / Areas:** Slice 3 - Task 3.2 (Frontend System Config Admin UI)

## Summary

Implemented the locale-aware frontend System Config admin page for `/vi/admin/config` and `/en/admin/config` using the established service-hook-feature pattern. The delivery includes typed System Config contracts, category-grouped accordion UI, value-type-specific editors, secret update confirmation, JWT-claim-based capability gating, and synchronized documentation updates.

## Completed Items

- [x] Added typed System Config frontend contracts aligned with backend response shape (`{[category]: SystemConfig[]}`).
- [x] Added typed System Config service functions for list/detail/update endpoints.
- [x] Added deterministic config value parse/validate/serialize helper logic for `bool`, `int`, `string`, `json`, and `secret`.
- [x] Added API-error to i18n-key mapper for System Config flows.
- [x] Added `useSystemConfig` hook for loading, edit orchestration, row-level save state, and secret reveal flow.
- [x] Extended RBAC capability typing and claim helper to include System Config-related capabilities.
- [x] Implemented feature UI components for toolbar, category accordion, and row editor.
- [x] Implemented route entry page at `frontend/app/[locale]/(app)/admin/config/page.tsx`.
- [x] Added dashboard navigation link to admin config route.
- [x] Added full `adminConfig` translation namespace for both Vietnamese and English dictionaries.
- [x] Updated status, implementation plan, API notes, and FE page inventory documentation for Task 3.2 completion.

## Key Implementations

### Service + Hook Orchestration

1. Introduced `system-config.service.ts` with typed wrappers for `GET /api/admin/config/`, `GET /api/admin/config/{key}/`, and `PATCH /api/admin/config/{key}/`.
2. Added `useSystemConfig` to centralize load/update flow, row-level mutation state (`savingKeys`), and edit-mode input state per config key.
3. Added deterministic row-level validation before PATCH submission to avoid invalid payloads for each `value_type`.

### UI Rendering Model

1. Implemented a category-grouped accordion to render config rows by category with collapsible sections.
2. Implemented row editor control by type: checkbox for `bool`, number input for `int`, text input for `string/secret`, textarea JSON editor for `json`.
3. Added explicit secret update confirmation dialog before submitting changes to secret keys.

### Security + Capability Behavior

1. Added System Config capability derivation from JWT permission claims (`list`, `retrieve`, `partial_update/update`, `view_secret`).
2. Enforced read-only UX when update capability is missing.
3. Kept secret display masked by default and provided gated reveal action only for principals with secret-view capability.

## Files Changed

| File | Change Summary |
|------|---------------|
| `frontend/src/types/admin.types.ts` | Replaced legacy grouped response types with active API-aligned contracts and input value unions. |
| `frontend/src/types/rbac.types.ts` | Added `SystemConfigCapabilities` interface. |
| `frontend/src/lib/rbac-claim.ts` | Added `canManageSystemConfig` capability helper. |
| `frontend/src/services/system-config.service.ts` | New typed System Config API service module. |
| `frontend/src/lib/system-config-value.ts` | New value parse/serialize/validation helper for config editors. |
| `frontend/src/lib/system-config-error-map.ts` | New System Config API error normalization helper. |
| `frontend/src/hooks/useSystemConfig.ts` | New hook for page state orchestration and mutations. |
| `frontend/src/components/features/admin-config/SystemConfigToolbar.tsx` | New search/filter/refresh toolbar component. |
| `frontend/src/components/features/admin-config/SystemConfigCategoryAccordion.tsx` | New category accordion renderer. |
| `frontend/src/components/features/admin-config/SystemConfigRowEditor.tsx` | New row editor component with type-driven controls and actions. |
| `frontend/src/components/features/admin-config/SystemConfigPageClient.tsx` | New feature page container integrating hook and components. |
| `frontend/app/[locale]/(app)/admin/config/page.tsx` | New locale-aware route page entry. |
| `frontend/app/[locale]/(app)/dashboard/page.tsx` | Added dashboard link to admin config page. |
| `frontend/messages/vi.json` | Added `adminConfig` i18n namespace (Vietnamese). |
| `frontend/messages/en.json` | Added `adminConfig` i18n namespace (English). |
| `docs/STATUS.md` | Marked Slice 3 Task 3.2 as completed and synced pending table. |
| `docs/FE_PAGE_INVENTORY.md` | Updated admin config route status to implemented. |
| `docs/IMPL_PLAN.md` | Marked Task 3.2 as completed and updated file references. |
| `docs/API.md` | Added frontend readiness note for system config route family. |

## Tests and Verification

Executed in `frontend/`:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Result:

- Lint: passed.
- Type check: passed.
- Build: passed.
- Build output includes static routes for `/vi/admin/config` and `/en/admin/config`.

## Notes / Caveats

- Backend serializer currently masks secret values in standard response rendering; reveal endpoint behavior may still return masked values depending on backend policy path.
- Client-side capability gating assumes permission catalog is available from RBAC endpoint; if permission discovery payload changes, capability mapping may need adjustments.
