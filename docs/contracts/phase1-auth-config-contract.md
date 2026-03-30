# Phase 1 Contract - Auth + System Config

**Date:** 2026-03-30
**Scope:** Contract snapshot for Phase 1 handoff (A <-> B)

## 1. Auth API (current implementation)

### Endpoint
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`

### TypeScript interfaces

```ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RefreshRequest {
  refresh: string;
}

export interface RefreshResponse {
  access: string;
  // Current backend returns refresh too (rotation behavior).
  // Keep optional for compatibility if backend changes later.
  refresh?: string;
}

export interface ApiErrorResponse {
  detail?: string;
  [key: string]: unknown;
}
```

## 2. System Config API (Phase 1B completed)

### Endpoint
- `GET /api/admin/config/`
- `GET /api/admin/config/{key}/`
- `PATCH /api/admin/config/{key}/`

### TypeScript interfaces

```ts
export type ConfigValueType = "bool" | "int" | "string" | "json" | "secret";

export type ConfigValue = boolean | number | string | Record<string, unknown> | unknown[];

export interface SystemConfigItem {
  id: number;
  key: string;
  value: ConfigValue | "***";
  value_type: ConfigValueType;
  category: string;
  description: string | null;
  is_editable: boolean;
  is_runtime: boolean;
}

export type SystemConfigGroupedResponse = Record<string, SystemConfigItem[]>;

export interface SystemConfigUpdateRequest {
  value: ConfigValue;
}
```

### Behavior constraints
- `value_type=secret` always returns `"***"` on GET APIs.
- `is_editable=false` returns `403` on PATCH.
- Type mismatch returns `400` with validation errors.
- Non-admin access returns `403`.

## 3. Known gaps (A-side pending)

- `POST /api/auth/register/` not implemented yet.
- `POST /api/auth/logout/` and `POST /api/auth/logout-all/` not implemented yet.
- Full `UserSession` lifecycle + revoke flow pending.
- SSO callback flow pending.
