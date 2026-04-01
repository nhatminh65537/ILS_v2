---
goal: Frontend Surface Split and Layout Standardization for User and Admin
version: 1.0
date_created: 2026-04-01
last_updated: 2026-04-01
owner: Frontend Team
status: 'Completed'
tags: [architecture, frontend, admin, layout, refactor, docs]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines deterministic implementation steps to separate User and Admin frontend surfaces while keeping development access paths under `/{locale}/admin/*`, adding complete layout shells (navbar/sidebar/content/footer), aligning frontend mock handlers with backend API contracts, and synchronizing architecture/documentation artifacts in the same session.

## 1. Requirements & Constraints

- **REQ-001**: Keep development admin routes under `/{locale}/admin/*`.
- **REQ-002**: Create a dedicated admin login route `/{locale}/admin/login`.
- **REQ-003**: Admin surface must not provide registration flow.
- **REQ-004**: Split frontend route ownership into two surfaces: User surface and Admin surface.
- **REQ-005**: Add complete layout shells for both surfaces: navbar, sidebar, content region, footer.
- **REQ-006**: Keep locale-first route model unchanged (`/vi/*`, `/en/*`).
- **REQ-007**: Update MSW handlers to include RBAC and System Config endpoints used by frontend services.
- **REQ-008**: Ensure mock auth tokens include claims needed by frontend permission gates.
- **SEC-001**: Guard admin surface access with explicit client-side permission checks and deterministic redirect/fallback behavior.
- **SEC-002**: Do not expose admin register routes or links in admin UI.
- **CON-001**: Vhost/domain split is deferred; do not implement deploy topology changes in this task.
- **CON-002**: Preserve existing backend API contracts; frontend refactor only.
- **GUD-001**: Keep service-layer rule: page/components do not call Axios directly.
- **PAT-001**: Route-level split first, then layout shell, then mock/contract alignment, then docs sync.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Create explicit architecture plan and route split boundaries.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create implementation plan file in `plan/` following deterministic template requirements. | ✅ | 2026-04-01 |
| TASK-002 | Define User and Admin route ownership in App Router without changing URL path contracts. | ✅ | 2026-04-01 |
| TASK-003 | Define shell component inventory for shared and surface-specific layout sections. | ✅ | 2026-04-01 |

### Implementation Phase 2

- GOAL-002: Refactor frontend routing into separate User/Admin surfaces with explicit admin auth entry.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Move admin routes into dedicated admin route-group surface while preserving URL `/{locale}/admin/*`. | ✅ | 2026-04-01 |
| TASK-005 | Add `/{locale}/admin/login` page and remove any admin-register affordance. | ✅ | 2026-04-01 |
| TASK-006 | Add layout wrappers for user surface and admin surface with isolated navigation structures. | ✅ | 2026-04-01 |

### Implementation Phase 3

- GOAL-003: Implement complete layout shells and wire navigation for normal website UX.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Implement `src/components/layouts/*` shell components (navbar, sidebar, footer, shell wrappers). | ✅ | 2026-04-01 |
| TASK-008 | Apply user shell to user pages and admin shell to admin protected pages. | ✅ | 2026-04-01 |
| TASK-009 | Keep admin login page outside admin protected shell while preserving consistent visual language. | ✅ | 2026-04-01 |

### Implementation Phase 4

- GOAL-004: Align frontend mock handlers and permission claims to backend contract usage.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Add RBAC handlers for `/api/admin/permissions/*`, `/api/admin/roles/*`, `/api/users/{id}/roles/*`. | ✅ | 2026-04-01 |
| TASK-011 | Add System Config handlers for `/api/admin/config/*` list/detail/update contracts. | ✅ | 2026-04-01 |
| TASK-012 | Update auth mock token generation to include JWT-like claims required by frontend capability logic. | ✅ | 2026-04-01 |

### Implementation Phase 5

- GOAL-005: Synchronize all architecture/documentation sources and verify quality gates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Update docs (`DECISIONS`, `ARCHITECTURE`, `IMPL_PLAN`, `STATUS`, `FE_CONVENTIONS`, `FE_PAGE_INVENTORY`, `FE_SETUP`) to reflect new frontend topology. | ✅ | 2026-04-01 |
| TASK-014 | Sync frontend local docs (`frontend/app/README.md`, `frontend/src/components/README.md`, `frontend/src/components/layouts/README.md`). | ✅ | 2026-04-01 |
| TASK-015 | Run `npm run lint`, `npx tsc --noEmit`, `npm run build` and resolve introduced issues. | ✅ | 2026-04-01 |

## 3. Alternatives

- **ALT-001**: Keep single surface with conditional rendering for admin sections.
Reason not chosen: maintains coupling and blocks later independent admin deployment.
- **ALT-002**: Split into two separate frontend projects immediately.
Reason not chosen: higher migration cost now; route-level split first provides safer transition.
- **ALT-003**: Skip shell refactor and only style individual pages.
Reason not chosen: does not solve structural consistency or surface boundaries.

## 4. Dependencies

- **DEP-001**: Existing auth/rbac/system-config frontend service contracts.
- **DEP-002**: Existing locale routing via `next-intl`.
- **DEP-003**: Existing backend API route contracts in `docs/API.md` and implementation in `backend/api/admin_views.py`.
- **DEP-004**: Existing UI primitives in `frontend/src/components/ui/*`.

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(app)/*` user surface pages/layout.
- **FILE-002**: `frontend/app/[locale]/(admin)/admin/*` admin surface pages/layout.
- **FILE-003**: `frontend/src/components/layouts/*` shell components.
- **FILE-004**: `frontend/src/mocks/handlers/index.ts` and new admin handler files.
- **FILE-005**: `frontend/src/mocks/handlers/auth.handlers.ts` for claim-aligned tokens.
- **FILE-006**: `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/IMPL_PLAN.md`, `docs/STATUS.md`, `docs/FE_CONVENTIONS.md`, `docs/FE_PAGE_INVENTORY.md`, `docs/FE_SETUP.md`.
- **FILE-007**: `frontend/app/README.md`, `frontend/src/components/README.md`, `frontend/src/components/layouts/README.md`.

## 6. Testing

- **TEST-001**: User routes load with user shell and no admin shell leakage.
- **TEST-002**: Admin login route exists and does not show register links.
- **TEST-003**: Admin protected pages load inside admin shell and navigation works.
- **TEST-004**: RBAC page CRUD/assignment controls work in MSW-only mode.
- **TEST-005**: System Config page list/detail/update flows work in MSW-only mode.
- **TEST-006**: Permission gate behavior changes based on mock JWT claims as expected.
- **TEST-007**: Lint/typecheck/build pass.

## 7. Risks & Assumptions

- **RISK-001**: Route moves can break links if locale path composition is inconsistent.
- **RISK-002**: Existing capability checks may still gate actions if mock claims are incomplete.
- **RISK-003**: Documentation and code can diverge again without full same-session sync.
- **ASSUMPTION-001**: Backend contracts for RBAC and System Config remain unchanged.
- **ASSUMPTION-002**: Vhost-level separation remains deferred to deployment phase.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/DECISIONS.md
- docs/ARCHITECTURE.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/FE_CONVENTIONS.md
- docs/FE_PAGE_INVENTORY.md
- docs/FE_SETUP.md
- docs/API.md
