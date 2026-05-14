# BUGS.md — ILS v2 Known Bugs & Issues

> Track all known bugs here. Update when fixing or discovering new issues.
> Format: one table per severity level. Move bugs to **Fixed** section after resolving.

---

## Active Bugs

### High — Breaks functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| - | - | No active high bugs currently tracked. | - |

### Medium — Degrades functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| - | - | No active medium bugs currently tracked. | - |


### Low — Minor issues / tech debt

| # | File | Description | Fix |
|---|------|-------------|-----|
| L1 | `ai/services/llm_client.py` | LLM client is a mock — always returns a hardcoded string. | Implement real provider call in Slice 10 (deferred). |
| L2 | `api/models.py` | `QuizQuestion` thiếu composite index trên `(quiz, status)` — field `status` được filter thường xuyên nhưng chỉ có index trên `quiz` đơn lẻ. | Thêm `models.Index(fields=['quiz', 'status'])` trong Meta. |
| L4 | Frontend testing environment (Playwright integrated browser viewport) | Case responsive J-3 (`<=768px`) chưa xác thực được trong phiên tool hiện tại vì viewport thực tế bị giữ ~804px; chưa kết luận pass/fail. | **Deferred test note:** chạy lại bằng Playwright CLI headless/headed ngoài integrated browser để kiểm tra breakpoint chuẩn. |
| L5 | `frontend/src/lib/rbac-claim.ts`, `frontend/src/components/layouts/AdminAccessGate.tsx`, admin feature hooks/pages | FE đang hardcode permission key/capability check để chặn thao tác sớm; chưa khớp định hướng dài hạn "BE authoritative authorization". Mục tiêu tương lai: FE cho phép thao tác bình thường, backend trả `403` cho cả GET/mutation khi không đủ quyền, FE hiển thị dialog lỗi thống nhất. Guard admin hiện tại là cơ chế tạm thời. | Refactor dần sang mô hình BE-first authz: giảm/bỏ hardcoded permission map ở FE, chuẩn hóa xử lý `403` tại interceptor + UX dialog, giữ guard tạm ở mức tối thiểu cho đến khi rollout hoàn tất. |

---

## Recently Fixed Bugs (last 10)

> Older fixes archived — see "Fixed (Archived)" below + git log for full history.

| # | Fixed | File | Description | How Fixed |
|---|-------|------|-------------|-----------|
| F26 | 2026-04-19 | `backend/auth_app/services/token_service.py`, `frontend/src/components/layouts/AdminAccessGate.tsx`, `frontend/src/components/features/auth/AdminLoginForm.tsx`, `frontend/src/lib/rbac-claim.ts` | **H3 + H7**: frontend admin surface only checked authenticated state, allowing member accounts onto admin routes and destabilizing `/admin/users` verification. | Added `admin_surface` JWT claim derived from backend `Admin`/`Editor` role membership, wired the frontend admin guard to that claim, rejected non-admin-surface admin logins immediately, and aligned MSW mock tokens/messages with the same contract. |
| F27 | 2026-04-20 | `frontend/playwright.slice7.checklist.test.ts`, `frontend/scripts/slice7-diagnostics.mjs` | Slice 7 browser checklist helpers produced false negatives by opening protected quiz routes without logging in first and by using stale admin password `admin` instead of seeded `admin1234`. | Updated the checklist Playwright helpers to authenticate before protected user-route checks, wait for login redirects deterministically, and switched both checklist and diagnostics scripts to canonical seeded credentials (`admin1234`, `member1234`). |
| F28 | 2026-04-20 | `backend/api/services/quiz_service.py`, `backend/realtime/consumers/quiz_consumer.py`, `frontend/src/hooks/useQuizSession.ts` | Slice 7 runtime mismatches: default quiz config randomized questions/options despite checklist contract, empty quizzes errored instead of finishing `0/0`, and frontend WS client ignored `NEXT_PUBLIC_WS_URL` while collapsing protocol close codes into generic connection errors. | Changed quiz-config defaults to `random_question=false` / `random_option=false`, made empty published quizzes finish immediately over WS, updated `useQuizSession` to prefer `NEXT_PUBLIC_WS_URL`, and mapped auth/session-specific close codes to deterministic client error states. Regression tests added for config defaults and empty-quiz finish behavior. |
| F29 | 2026-04-20 | `frontend/src/hooks/useAdminNotifications.ts`, `frontend/src/components/features/notifications/AdminNotificationBroadcastClient.tsx` | Task 9.5 admin notifications rendered raw duplicated i18n keys (`adminNotifications.adminNotifications.errors.submitFailed`, `...historyLoadFailed`) because hook/component emitted fully-qualified keys while `useTranslations('adminNotifications')` already scoped namespace. | Changed admin notification error keys to relative namespace paths (`errors.*`) for both submit and history flows; UI now resolves localized messages correctly. |
| F30 | 2026-04-20 | `frontend/messages/en.json`, `frontend/messages/vi.json` | Admin notifications metadata placeholder triggered next-intl runtime parse error `INVALID_MESSAGE: MALFORMED_ARGUMENT` due to ICU-like braces in translation value (`{"key":"value"}`). | Replaced placeholder with non-ICU literal (`"key": "value"`) in both locales to avoid argument parsing. |
| F31 | 2026-04-20 | `backend/db.sqlite3`, `backend/api/migrations/0008_notification_event_key.py` | Admin broadcast endpoint returned `500` (`OperationalError: table notification has no column named event_key`) on local runtime because migration `api.0008_notification_event_key` existed but was not applied to active SQLite database. | Applied `../.venv/Scripts/python.exe manage.py migrate api`; verified `showmigrations` now marks `0008_notification_event_key` as applied. |
| F32 | 2026-05-04 | `frontend/app/[locale]/page.tsx` | Homepage always showed login/register CTA buttons regardless of authentication state (server component couldn't check auth). | Extracted CTA into client component `HomeCTA.tsx` using `useAuth()` hook; shows dashboard/courses links when authenticated. |
| F33 | 2026-05-04 | `frontend/messages/en.json`, `frontend/messages/vi.json` | `flagPlaceholder` (`ILS{...}`) and `flagValuePlaceholder` (`CTF{...}`) triggered `INVALID_MESSAGE: MALFORMED_ARGUMENT` next-intl parse error because unescaped braces `{...}` were interpreted as ICU message arguments. | Escaped braces with ICU single-quote literals: `ILS'{...}'` and `CTF'{...}'`. |
| F34 | 2026-05-04 | `frontend/src/hooks/useAdminChallenges.ts`, `frontend/src/components/features/challenges/admin/AdminChallengeInstancesPageClient.tsx` | `result.items` accessed on `PaginatedResponse<T>` which uses `results` field (DRF convention); `items` was `undefined`, causing `data` to be `undefined` and crashing on `.length` access. | Changed to `result.results` with proper type casting; added defensive null guard in `AdminChallengeListPageClient.tsx`. |
| F35 | 2026-05-04 | `frontend/src/stores/courses.store.ts`, `frontend/src/components/features/courses/LessonViewerClient.tsx` | Lesson complete button didn't stay disabled after re-visiting a completed lesson because `resetLessonState()` cleared `isCompleted` with no way to restore (no GET progress endpoint). | Added `completedLessonIds: Set<number>` to store; `resetLessonState(currentLessonId?)` preserves completion for known IDs; added early-return guards in `handleStart`/`handleComplete`. |

---

## Fixed (Archived)

> **F1–F25 (2026-03-09 → 2026-04-14):** 25 bugs đóng trong các batch backend refactor + frontend MSW/i18n + RBAC unification + AI app cleanup. Bao gồm: typos `ai/` package (F1–F6), settings INSTALLED_APPS (F7), admin gate / RBAC normalization (F8–F9), MSW/quiz handlers (F10–F11, F22–F24), i18n ICU placeholders (F12, F14), permission unification removing `IsAdminUser` + `action_permission_map` (F15–F17), quiz progress endpoint wiring (F18), admin user uniqueness (F19), public profile route + 404 contract (F20), account update UX (F21), settings enum validation (F25).
>
> **Để tra cứu chi tiết:** `git log -- docs/BUGS.md` (commits trước 2026-04-19) hoặc `docs/reports/2026-04-14_*.md` (3 reports gồm bugfix batch H4/H6/H8/M6/M7/M9/M10, H2/M2/M4/M5/L3, refactor closure).

---

## Tracking Notes

- **Discovery session:** 2026-03-09 — full project review identified F1–F7 architecture/typo issues.
- **Architecture violations to guard against:** See `docs/ARCHITECTURE.md` §7 "What NOT To Do".
- **Doc-code inconsistencies:** Resolved during normalization Session 2 (2026-05-04). Lesson `status`, `video_duration`, course `structure_version` are now in sync between `docs/DATA_MODEL.md` and `backend/api/models.py`. See `docs/normalization/02-tier2-drift.md` items D-02-01 / D-02-02 / D-02-03.
