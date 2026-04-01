# BUGS.md — ILS v2 Known Bugs & Issues

> Track all known bugs here. Update when fixing or discovering new issues.
> Format: one table per severity level. Move bugs to **Fixed** section after resolving.

---

## Active Bugs

### High — Breaks functionality

*None currently.*

### Medium — Degrades functionality

*None currently.*

### Low — Minor issues / tech debt

| # | File | Description | Fix |
|---|------|-------------|-----|
| L1 | `ai/services/llm_client.py` | LLM client is a mock — always returns a hardcoded string. | Implement real provider call in Slice 10 (deferred). |

---

## Fixed Bugs

> Bugs resolved in previous sessions. Kept for history.

| # | Fixed | File | Description | How Fixed |
|---|-------|------|-------------|-----------|
| F1 | 2026-03-09 | `ai/serializers.py` | Typo `"lern_assistant"` in ChoiceField | Corrected to `"learn_assistant"`; now uses `AImode` constants |
| F2 | 2026-03-09 | `ai/models.py` | Field named `node` stored AI mode value — wrong semantics. `__str__` referenced `self.mode` which didn't exist. | Renamed field `node` → `mode`; `__str__` now resolves correctly |
| F3 | 2026-03-09 | `ai/services/context_loader.py` | `lesson.content` doesn't exist on the `Lesson` model | Changed to `lesson.content_md or ""` |
| F4 | 2026-03-09 | `ai/permissons.py` | Filename typo ("permissons"). Used Django's built-in `has_perm()` which violates architecture rules (ARCHITECTURE.md §7) | Renamed to `permissions.py`; rewrote to check JWT claims |
| F5 | 2026-03-09 | `ai/url.py` | Non-standard filename (missing 's') inconsistent with Django convention | Renamed to `urls.py` |
| F6 | 2026-03-09 | `backend/backend/urls.py` | AI URLs not wired into root URLconf | Added `include('ai.urls')` (now commented — AI is deferred) |
| F7 | 2026-03-09 | `backend/backend/settings.py` | `realtime`, `rest_framework`, `corsheaders` missing from `INSTALLED_APPS` | Added all three |
| F8 | 2026-04-01 | `frontend/src/components/layouts/AdminAccessGate.tsx` | Admin route guard could redirect valid admin users to `/{locale}/dashboard` when permission catalog did not include full permission set. | Removed temporary permission-catalog gate and kept auth-only guard until a replacement access mechanism is implemented. |
| F9 | 2026-04-01 | `frontend/src/services/rbac.service.ts`, `frontend/src/hooks/useRbac.ts` | RBAC permission list could arrive as a paginated object, causing `permissionsState.data.filter` to throw at runtime. | Normalized RBAC list responses to arrays in the service and added a defensive array guard in the hook. |

---

## Tracking Notes

- **Discovery session:** 2026-03-09 — full project review
- **Architecture violations to guard against:** See `docs/ARCHITECTURE.md` §7 "What NOT To Do"
- **IMPL_PLAN conflicts (not bugs, but inconsistencies to fix):**
  - ~~`IMPL_PLAN.md` Task 0.3 uses `auth.native_enabled` → should be `auth.local_login_enabled` (per `CONFIG.md`)~~ ✅ Fixed 2026-03-12
  - ~~`IMPL_PLAN.md` Task 0.3 uses `ai.daily_limit` → should be `ai.rate_limit_per_hour` (per `CONFIG.md`)~~ ✅ Already correct in current code
  - ~~`IMPL_PLAN.md` Task 0.3 uses `is_secret=BooleanField` pattern → should use `value_type='secret'` (per `DATA_MODEL.md`)~~ ✅ Fixed 2026-03-12
  - ~~`ARCHITECTURE.md` §6 diagram lists `auth` app → should be `auth_app`~~ ✅ Already correct in current code
  - `prd/01-authentication.md` FR-AUTH-10 used `auth.native_enabled` → updated to `auth.local_login_enabled` ✅ Fixed 2026-03-12
  - `prd/10-system-config.md` FR-CFG-05 used outdated key names → updated to match `CONFIG.md` ✅ Fixed 2026-03-12
  - `prd/01-authentication.md` edge case table used `native_enabled` → `local_login_enabled` ✅ Fixed 2026-03-12
  - `prd/04-challenge.md` edge case table used `deploy_enabled` → `deploy.enabled` ✅ Fixed 2026-03-12
  - `prd/09-ai-assistant.md` used `ollama` provider → updated to `anthropic` (per `CONFIG.md`) ✅ Fixed 2026-03-12
  - `prd/09-ai-assistant.md` missing `ai.enabled` key → added ✅ Fixed 2026-03-12
  - `prd/10-system-config.md` missing `auth.email.use_tls`, `auth.email.username`, `auth.email.sender_name` → added ✅ Fixed 2026-03-12
  - `docs/DATA_MODEL.md` header claimed `dbv3.sql` as source of truth → corrected to self-authoritative ✅ Fixed 2026-03-12
  - `IMPL_PLAN.md` seed_config missing `auth.registration_enabled` → added ✅ Fixed 2026-03-12
