## `src/lib/`

Shared utilities and configurations.

Files:
- `axios.ts` — Axios instance with request/response interceptors (token attach, 401 refresh, error normalization)
- `utils.ts` — `cn()` helper for Tailwind class merging

**Rule**: All HTTP client setup centralized here. No direct axios imports in components.
