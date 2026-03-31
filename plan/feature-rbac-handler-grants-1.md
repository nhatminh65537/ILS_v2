---
goal: Slice 2 Phase 1 RBAC Handler-Grant Contract
version: 1.0
date_created: 2026-03-31
last_updated: 2026-03-31
owner: Backend Team
status: 'Completed'
tags: [feature, architecture, authz, rbac, jwt]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This implementation plan defines deterministic Phase 1 decisions for RBAC handler-level role grants and Task 2.3 permission bitmap contracts before code changes are executed.

## 1. Requirements & Constraints

- **REQ-001**: Role grants must support endpoint handler specificity without requiring method override boilerplate for DRF mixin defaults.
- **REQ-002**: Permission computation must remain flat (no parent-child hierarchy walk).
- **REQ-003**: JWT permission claims contract must be `permissions` (base64 bitmap) and `pv` (permission version).
- **REQ-004**: Permission naming remains lowercase `{app_label}.{resource_name}.{handler_method_name}`.
- **SEC-001**: Authorization checks in production must use token bitmap checks, with no per-request DB permission query.
- **CON-001**: Existing class-level `@add_role_granted` behavior must remain backward compatible.
- **CON-002**: Documentation updates must be synchronized in the same session (`ARCHITECTURE`, `DECISIONS`, `IMPL_PLAN`, `API`, `STATUS`).
- **GUD-001**: Decision records are authoritative for implementation sequence and must be updated before implementation starts.
- **PAT-001**: Route action map (`callback.actions`) is the source of truth for handler detection for both custom actions and mixin defaults.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Lock architecture and contract decisions for endpoint-level role grants and Task 2.3.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Resolve max bitmap capacity decision to 256 bits (Option B) and update decision logs. | ✅ | 2026-03-31 |
| TASK-002 | Define hybrid grant precedence contract: handler-level decorator override > class-level default. | ✅ | 2026-03-31 |
| TASK-003 | Define mixin-default handler policy: explicit override + super() when specific role differs from class baseline. | ✅ | 2026-03-31 |
| TASK-004 | Align Task 2.3 plan text with flat permissions model and bitmap contract. | ✅ | 2026-03-31 |
| TASK-005 | Synchronize API/architecture/status documentation for Phase 1 decisions. | ✅ | 2026-03-31 |

### Implementation Phase 2

- GOAL-002: Implement code changes based on Phase 1 contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Extend decorators so `@add_role_granted(...)` works explicitly at handler-level and class-level with deterministic precedence. | ✅ | 2026-03-31 |
| TASK-007 | Update discovery role resolution in `backend/auth_app/services/permission_discovery.py` with precedence rules. | ✅ | 2026-03-31 |
| TASK-008 | Refactor `backend/api/services/permission_service.py` to produce and cache bitmap base64 using flat permission IDs. | ✅ | 2026-03-31 |
| TASK-009 | Update token issuance in `backend/auth_app/services/token_service.py` to emit `permissions` and `pv` claims. | ✅ | 2026-03-31 |
| TASK-010 | Add/adjust auth RBAC tests for mixin default handlers, action overrides, cache invalidation, and bitmap claims. | ✅ | 2026-03-31 |

## 3. Alternatives

- **ALT-001**: Store action-role map in class metadata only (no explicit handler decorator).
Reason not chosen: less explicit in handler source code, lower local readability for endpoint-level control.
- **ALT-002**: Keep class-only grants for all handlers.
Reason not chosen: does not satisfy endpoint-level role granularity requirements.
- **ALT-003**: Keep text/list permission payload in JWT.
Reason not chosen: conflicts with bitmap architecture and performance goals.

## 4. Dependencies

- **DEP-001**: Existing discovery startup hook in `backend/auth_app/apps.py`.
- **DEP-002**: RBAC data model in `backend/api/models.py` (`Permission`, `Role`, `RolePermission`, `UserRole`, `UserPermission`, `UserPermissionCache`).
- **DEP-003**: Existing test suites in `backend/auth_app/tests.py`.

## 5. Files

- **FILE-001**: `docs/DECISIONS.md` — resolved bitmap capacity and hybrid grant decision.
- **FILE-002**: `docs/ARCHITECTURE.md` — updated role grant architecture and startup sequence.
- **FILE-003**: `docs/IMPL_PLAN.md` — synced Slice 2 contracts.
- **FILE-004**: `docs/API.md` — synced planned Slice 2 claim and role mapping contracts.
- **FILE-005**: `docs/STATUS.md` — updated blocker status and in-progress tracking.

## 6. Testing

- **TEST-001**: Validate docs consistency for RBAC contract references across updated files.
- **TEST-002**: During Phase 2, run `pytest backend/auth_app/tests.py -k "jwt or permission or discovery"`.

## 7. Risks & Assumptions

- **RISK-001**: Claim key migration (`permission_version` vs `pv`) can break existing tests or consumers if not coordinated.
- **RISK-002**: Incorrect action key names (`partial_update` vs `patch`) can misassign role grants.
- **ASSUMPTION-001**: Permission count remains within 256 for current MVP scope.
- **ASSUMPTION-002**: Hybrid action-level decorator naming is finalized during Phase 2 implementation.

## 8. Related Specifications / Further Reading

- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/IMPL_PLAN.md
- docs/API.md
- docs/STATUS.md
- docs/prd/02-authorization.md
