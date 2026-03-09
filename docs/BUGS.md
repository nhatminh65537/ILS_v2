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

---

## Tracking Notes

- **Discovery session:** 2026-03-09 — full project review
- **Architecture violations to guard against:** See `docs/ARCHITECTURE.md` §7 "What NOT To Do"
- **IMPL_PLAN conflicts (not bugs, but inconsistencies to fix):**
  - `IMPL_PLAN.md` Task 0.3 uses `auth.native_enabled` → should be `auth.local_login_enabled` (per `CONFIG.md`)
  - `IMPL_PLAN.md` Task 0.3 uses `ai.daily_limit` → should be `ai.rate_limit_per_hour` (per `CONFIG.md`)
  - `IMPL_PLAN.md` Task 0.3 uses `is_secret=BooleanField` pattern → should use `value_type='secret'` (per `DATA_MODEL.md`)
  - `ARCHITECTURE.md` §6 diagram lists `auth` app → should be `auth_app`
