# Normalization LEDGER

> **Mục đích:** Truy ngược cho `docs/reports/` (~70 file) và `docs/intests/` (9 file).
> Khi normalize "live docs" rename / move / xoá / merge một section hoặc file, bắt buộc thêm 1 dòng vào bảng dưới.
> Reports cũ tham chiếu tới anchor cũ → người đọc tra LEDGER này để tìm vị trí mới.

---

## Cách dùng

1. **Khi bạn rename / move / xoá / merge bất kỳ heading hoặc file nào trong live docs**, append 1 dòng vào bảng "Entries" bên dưới.
2. **Format anchor:** `path/file.md#section-slug` (markdown anchor lowercase, dấu cách → dấu gạch ngang).
3. **Action chọn 1 trong:**
   - `renamed` — đổi tên file/heading nhưng nội dung giữ nguyên.
   - `moved` — chuyển sang file/section khác.
   - `merged_into` — gộp vào section khác (ghi rõ section đích).
   - `removed` — xoá hẳn (ghi lý do và commit hash để truy git history).
   - `archived` — chuyển sang `docs/reports/` hoặc `docs/archive/`.

---

## Entries

| Date | Old anchor | Action | New anchor / Note | Session |
|---|---|---|---|---|
| 2026-05-04 | `docs/prd/09-ai-assistant.md` Status: `Scaffolded` | renamed | Status: `Deferred` + warning blockquote ở đầu file (D-01-01) | S1 |
| 2026-05-04 | `docs/prd/README.md` Implementation Order #10 (AI Assistant) | moved | Tách thành section `## Deferred Features` (D-01-01) | S1 |
| 2026-05-04 | `docs/REQUIREMENTS.md` (no §2.9) | added | New `### 2.9. AI Assistant — DEFERRED` (D-01-01) | S1 |
| 2026-05-04 | `docs/prd/10-system-config.md` Priority: `High (prerequisite for other features)` | renamed | Priority: `High` (D-01-06) | S1 |
| 2026-05-04 | `docs/prd/04-challenge.md` no FR-CHAL-06.1 | added | New `### FR-CHAL-06.1: Deployment Strategy (Pluggable Backend)` ref `instance_service.py:12-65` (D-01-03) | S1 |
| 2026-05-04 | `docs/DECISIONS.md` Q-CONFIG-01 Status `OPEN` | renamed | Status `RESOLVED (Option A)` + Implementation ref `seed_config.py:81-88` (D-01-02) | S1 |
| 2026-05-04 | `docs/DECISIONS.md` Q-AUTH-07 (no impl ref) | added | Implementation ref `auth_app/urls.py:23` + tests (D-01-05) | S1 |
| 2026-05-04 | `docs/DECISIONS.md` `## Index of Open Questions` | renamed | `## Decision Index (all)` + new `## Currently Open` section ngay phía trên (D-01-04) | S1 |
| 2026-05-04 | `docs/DECISIONS.md` `## CRITICAL Block Issues (Discovered 2026-03-24)` | renamed | `## Slice 1 Critical Block History (Discovered 2026-03-24, all RESOLVED)` (D-01-04) | S1 |
| 2026-05-04 | `docs/DECISIONS.md` `## OPEN Questions` | renamed | `## Slice 1 Infrastructure Decisions (all RESOLVED)` (D-01-04) | S1 |
| 2026-05-04 | `docs/DATA_MODEL.md` Lesson section (no `video_duration`) | added | `video_duration` row added to Lesson field table (D-02-02) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` `notification` + `user_notification` (2 entities) | merged_into | Single flat `notification` entity matching ORM; `user_notification` entity removed (D-02-05, D-02-08) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` `notification_type` enum values (`manual`, `auto_*`, `system`) | renamed | Category-based enum (`system`, `achievement`, `course`, `challenge`, `quiz`) matching ORM (D-02-06) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` Notification `send_at` field | removed | Field not in ORM; scheduled send is post-MVP (D-02-07) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` AuditLog schema (`event_type`, `target_table`, `target_id`, `diff`, `created_at`) | renamed | Rewritten to match ORM: `timestamp`, `actor_type`, `actor_id`, `actor_username`, `aggregate_type`, `aggregate_id`, `action`, `metadata`, `ip_address`, `user_agent` (D-02-09) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` User section (no `last_login_ip`) | added | `last_login_ip` row added to User field table (D-02-10) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` "Known system_config keys (summary)" 9-row table | removed | Replaced with pointer to `docs/CONFIG.md` (canonical key list) (D-02-12) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` §2 join-table audit rule | added | Carve-out note for join tables with mutable state (e.g. `lesson_question.position`) → FullAudit (D-02-03 revised) | S2 |
| 2026-05-04 | `docs/DATA_MODEL.md` `lesson_question` join table description | renamed | Now explicitly "FullAudit carve-out" with rationale (D-02-03 revised) | S2 |
| 2026-05-04 | `docs/CONFIG.md` AI section header | added | DEFERRED blockquote (Slice 10 not implemented, keys not seeded) (D-02-11) | S2 |
| 2026-05-04 | `docs/CONFIG.md` `auth.password_reset_enabled` entry | added | "Reserved" note (frontend stub only, no backend endpoint) (D-02-13 revised) | S2 |
| 2026-05-04 | `docs/DECISIONS.md`:1181 R-ARCH-12 cite `§4.10` | renamed | `§4.11` (correct section: Instance Deployment) (D-02-17) | S2 |
| 2026-05-04 | `docs/DECISIONS.md`:1199 R-DEV-01 cite `§4.11` | renamed | `§4.12` (correct section: Authorization Bypass) (D-02-16) | S2 |
| 2026-05-04 | `docs/ARCHITECTURE.md`:222 `permission_code` attribute mention | renamed | `HasJWTPermission('explicit.key')` in permission_classes (D-02-18) | S2 |
| 2026-05-04 | `docs/ARCHITECTURE.md`:183 `requirements.docx` reference | renamed | `docs/DECISIONS.md` (Decision Index + Q-AUTH/R-ARCH entries) (D-02-19) | S2 |
| 2026-05-04 | `docs/ARCHITECTURE.md` `api/views/` listing missing files | added | `admin_stats.py`, `challenge_nodes.py` added (D-02-20) | S2 |
| 2026-05-04 | `docs/STATUS.md` (no "Doc Normalization Follow-ups" section) | added | New section + task: audit dead system_config keys (D-02-15) | S2 |
| 2026-05-04 | `backend/api/models.py` Lesson (no `status` field) | added | `status` field with Status TextChoices + DB index + default 'draft'; migration `0009_lesson_status_userpermission_createaudit.py` (D-02-01) | S2 |
| 2026-05-04 | `backend/api/models.py` UserPermission `FullAudit` base class | renamed | `CreateAudit` base (drop `updated_at`/`updated_by`); migration `0009_lesson_status_userpermission_createaudit.py` (D-02-04) | S2 |
| 2026-05-14 | `docs/API_ROUTE_MAPPING.md` (entire file) | merged_into | `docs/API.md` §6 Route Migration / Legacy (C3, D-03-10) | S3 |
| 2026-05-14 | `docs/API.md` §4.3 Slice 6 Challenge sub-tables (Flags / Submit / Instance) | moved | `docs/API.md` §3.5 Active Endpoints (D-03-01, D-03-02) | S3 |
| 2026-05-14 | `docs/API.md` §3.6 Quizzes (no `move` row) | added | `POST /api/quiz/nodes/{id}/move/` row added to §3.6 (D-03-03) | S3 |
| 2026-05-14 | `docs/API.md` §3.10 `/api/users/{id}/roles/` rows (no methods note) | renamed | Added methods note: `UserRoleViewSet` supports only `list/create/destroy` (D-03-05) | S3 |
| 2026-05-14 | `API_ROUTE_MAPPING.md` §2 row `/api/lessons/` → `/api/learn/lessons/` | renamed | `API.md` §6.1 target rewritten to "no canonical namespaced list" note (D-03-06) | S3 |
| 2026-05-14 | `API_ROUTE_MAPPING.md` §2 row `/api/challenges/{id}/create-instance/` → `/instance/` | renamed | `API.md` §6.1 target split into `/instance/{start\|stop\|status}/` (D-03-07) | S3 |
| 2026-05-14 | `API_ROUTE_MAPPING.md` §2 rows `/api/quizzes/*` legacy | moved | `API.md` §6.3 Removed legacy routes (404) (D-03-08) | S3 |
| 2026-05-14 | `API_ROUTE_MAPPING.md` §2 rows `/api/authz/*` | removed | Never implemented; dropped from migration table (D-03-09) | S3 |
| 2026-05-14 | `docs/API.md` "Still pending in Slice 9: None" line | removed | Cosmetic noise removal (D-03-11) | S3 |
| 2026-05-14 | `docs/API.md` §1 Compatibility note ("upcoming slices" wording) | renamed | Rewritten as post-ship summary referencing §6 (D-03-12) | S3 |
| 2026-05-14 | `docs/API.md` §3.2 `POST /api/users/` Auth=No row | renamed | Flagged as ⚠️ TEMP/INSECURE with follow-up note (D-03-13) | S3 |
| 2026-05-14 | `docs/API.md` §3.8 Leaderboard (no pagination note) | added | Note about dedicated default page size 10 (D-03-14) | S3 |
| 2026-05-14 | `docs/API.md` 12 inline "Task X.Y update (date)" blocks across §3.3/§3.5/§3.6/§3.7 | removed | Git log preserves history; doc focuses on current state (D-03-15) | S3 |
| 2026-05-14 | `docs/API.md` §5 Deferred AI (no scaffold note) | added | Note that `backend/ai/urls.py` stub exists for future activation (D-03-16) | S3 |
| 2026-05-14 | `docs/STATUS.md` "Release docs gate" pointer line | renamed | Rewritten — points to `docs/reports/2026-04-01_slice5-8-docs-consistency-freeze.md` (D-04-01) | S4 |
| 2026-05-14 | `docs/STATUS.md` Q-CONFIG-01 Status `OPEN` | renamed | `RESOLVED (Option A — canonical 42 keys in seed_config.py:81-88)` (D-04-02) | S4 |
| 2026-05-14 | `docs/STATUS.md` `## Completed` table (stopped at 2026-04-20) | added | 13 new rows: Slice 11 / Tasks 11.1–11.5, Slice 6 / Tasks 6.1–6.7, Frontend bugfix batch 2026-05-04 (D-04-03) | S4 |
| 2026-05-14 | `docs/STATUS.md` `## Completed Task Evidence (Reports)` table | added | 19 new report rows + tail note about newer reports auto-listed at `docs/reports/` (D-04-04) | S4 |
| 2026-05-14 | `docs/STATUS.md` Slice 11 sub-table | added | Task 11.4 marked ✅; new row added for Task 11.5 (D-04-05) | S4 |
| 2026-05-14 | `docs/STATUS.md` `## ✅ CRITICAL BLOCK — RESOLVED (2026-03-24)` | moved | Merged into new `## 📜 Historical Decision Gates (all RESOLVED)` at bottom of file (D-04-07) | S4 |
| 2026-05-14 | `docs/STATUS.md` `## ⚠️ Pre-Implementation Gate (Resolved 2026-03-23)` | moved | Merged into `## 📜 Historical Decision Gates` at bottom of file (D-04-07) | S4 |
| 2026-05-14 | `docs/STATUS.md` `## 📋 Future Blockers (Resolve Before Task Implementation)` | renamed+moved | Title rewritten to "Slice 1–11 feature decisions (all RESOLVED)" and merged into `## 📜 Historical Decision Gates` at bottom (D-04-06 + D-04-07) | S4 |
| 2026-05-14 | `docs/STATUS.md` "Outline sync API + tab (deferrable)" | renamed | "Outline sync API + tab" with status `📋 Pending` per user clarification (D-04-10 revised) | S4 |
| 2026-05-14 | `docs/STATUS.md` "6.8 GitLab sync (separate delivery)" | renamed | Added `📋 Pending` marker per user clarification (D-04-10 revised) | S4 |
| 2026-05-14 | `docs/IMPL_PLAN.md` Tasks 5.1–5.7, 6.1–6.7, 7.2/7.3/7.4/7.6/7.7, 8.1–8.5, 9.1–9.5, 11.1–11.5 headings (no marker) | renamed | Added `✅ COMPLETED (YYYY-MM-DD)` suffix to ~28 task headings using ship dates from reports/STATUS (D-04-08) | S4 |
| 2026-05-14 | `docs/IMPL_PLAN.md` Task 5.8 heading "Outline Sync (deferrable)" | renamed | "Outline Sync 📋 PENDING (low priority)" per user clarification (D-04-10 revised) | S4 |
| 2026-05-14 | `docs/IMPL_PLAN.md` Task 6.8 heading "GitLab sync (separate delivery — not a blocker)" | renamed | Same heading + suffix `📋 PENDING` per user clarification (D-04-10 revised) | S4 |
| 2026-05-14 | `docs/TEAM_PLAN.md` (entire file) | archived | Moved to `docs/reports/2026-03-12_team-plan-snapshot.md` + historical-snapshot header note (C4, D-04-12) | S4 |
| 2026-05-14 | `docs/RELEASE_CHECKLIST_SLICE5_8.md` (entire file) | removed | Slice 5 & 8 shipped; gate closed. Git log preserves content. (C5, D-04-13) | S4 |
| 2026-05-14 | `backend/api/views/users.py` `@action profile` + `@action update_profile` (lines 89–95) | removed | Deprecated aliases of `me/profile`; no FE callers (verified via grep); migration done in 2026-04-10 Slice 8 Task 8.3 report (D-03-04) | S3 |
| 2026-05-14 | `docs/STATUS.md` "Legacy-to-target endpoint migration source is `docs/API_ROUTE_MAPPING.md`" | renamed | Now points to `docs/API.md` §6 (C3 follow-up) | S3 |
| 2026-05-14 | `docs/API.md` §6 Error/Security (was §6) | renamed | Renumbered to §7 to make room for new §6 Route Migration (C3) | S3 |
| 2026-05-14 | `docs/API.md` §7 Change Control (was §7) | renamed | Renumbered to §8 (C3) | S3 |
| 2026-05-14 | `docs/FE_SETUP.md` (entire file) | merged_into | `docs/FRONTEND.md` §1 Setup (C6, D-05-07) | S5 |
| 2026-05-14 | `docs/FE_CONVENTIONS.md` (entire file) | merged_into | `docs/FRONTEND.md` §2 Conventions (C6, D-05-07) | S5 |
| 2026-05-14 | `docs/FE_PAGE_INVENTORY.md` (entire file) | merged_into | `docs/FRONTEND.md` §3 Page Inventory (C6, D-05-07) | S5 |
| 2026-05-14 | `docs/FE_PAGE_INVENTORY.md` 6 route groups Status `skeleton` (leaderboard, challenges catalog, admin dashboard, admin statistics, admin learn/*, admin challenges/*) | renamed | Status flipped to `implemented` in `docs/FRONTEND.md` §3.4/3.6/3.10/3.11/3.12 + directory map §3.14 (D-05-01) | S5 |
| 2026-05-14 | `docs/FE_PAGE_INVENTORY.md` §Surface Overview single "User surface" row | renamed | Split into 3 rows (User auth / User app / User catalog) in `docs/FRONTEND.md` §3.2 (D-05-02) | S5 |
| 2026-05-14 | `docs/FE_PAGE_INVENTORY.md` Profile table (3 rows) | added | New row `/{locale}/profile` redirect → `/profile/settings` in `docs/FRONTEND.md` §3.8 (D-05-03) | S5 |
| 2026-05-14 | `docs/FE_SETUP.md` MSW Behavior admin handler list (4 patterns) | renamed | Pointer to `src/mocks/handlers/index.ts` in `docs/FRONTEND.md` §1.5 (D-05-04) | S5 |
| 2026-05-14 | `docs/FE_CONVENTIONS.md` Folder Structure (no `src/lib/`, partial route groups) + Surface Architecture Rules (missing `(auth)`/`(catalog)`) | renamed | Listed all 4 route groups + `src/lib/` + pointer to `src/{lib,components}/README.md` in `docs/FRONTEND.md` §2.1, §2.2 (D-05-05, D-05-06) | S5 |
| 2026-05-14 | `AGENT.md` (entire file, root) | merged_into | `CLAUDE.md` (root) — files were 100% identical after S0 ledger callout patch; CLAUDE.md is canonical (Claude Code auto-loads) (C1, D-06-01) | S6 |
| 2026-05-14 | `CLAUDE.md` §Key Documents — 3 rows `FE_SETUP/FE_CONVENTIONS/FE_PAGE_INVENTORY` | merged_into | Single row `docs/FRONTEND.md` (post-S5 reality) (D-06-02) | S6 |
| 2026-05-14 | `CLAUDE.md` §Key Documents — row `docs/API.md` description | renamed | Added note "§6 also covers route migration / legacy mapping (absorbed from former `API_ROUTE_MAPPING.md`)" (D-06-02, C3 follow-up) | S6 |
| 2026-05-14 | `CLAUDE.md` §Key Documents — `backend/api/models.py` "(~1195 lines)" | renamed | "(~2059 lines)" — reflects current size (D-06-02) | S6 |
| 2026-05-14 | `CLAUDE.md` §Key Documents | added | New row `docs/normalization/README.md` — doc normalization workflow pointer (D-06-02) | S6 |
| 2026-05-14 | `CLAUDE.md` Tier 6 `AGENT.md` entry | renamed | `CLAUDE.md` (Tier 6 root file after C1) (D-06-03) | S6 |
| 2026-05-14 | `CLAUDE.md` §Update Propagation Guide — 3 rows referencing `AGENT.md` (L92/95/96) | renamed | All 3 changed to `CLAUDE.md` (D-06-04) | S6 |
| 2026-05-14 | `CLAUDE.md` self-references "Phase 3" (L295, L322) | removed | Section heading is "Session Completion — Memory Update"; self-pointer dư thừa (D-06-05) | S6 |
| 2026-05-14 | `README.md` (entire file) | renamed | Full rewrite — refreshed status (Slices 0–9, 11 done; 5.8 + 6.8 pending; 10 deferred); replaced `AGENT.md` ref with `CLAUDE.md`; replaced 3 FE doc refs with `FRONTEND.md`; expanded `docs/` tree with all live files; replaced L151 broken "AGENT.md → Implementation Status" with `docs/STATUS.md` (C11, D-06-06) | S6 |
| 2026-05-14 | `DEV_WORKFLOW.md` L63 `AGENT.md` ref + L127 "CLAUDE.md → Phase 3" ref + L163 `AGENT.md` ref | renamed | L63/163 → `CLAUDE.md`; L127 → `CLAUDE.md §"Session Completion — Memory Update"` (D-06-07) | S6 |
| 2026-05-14 | `openmemory.md` Key Files — `backend/api/models.py` "(~1195 lines)" + `AGENT.md` row | renamed | "(~2059 lines)" + `CLAUDE.md` row noting "(canonical; absorbs former AGENT.md)" (D-06-09) | S6 |
| 2026-05-14 | `openmemory.md` §Document Dependency Tree (lines 232–264, ~33 lines duplicate of CLAUDE.md) | merged_into | 3-line pointer to `CLAUDE.md` §"Document Dependency Tree" — eliminates drift risk (D-06-10) | S6 |
| 2026-05-14 | `openmemory.md` stray row `\| DEV_WORKFLOW.md \| ... \|` at root level | moved | Now a proper row inside `## Documentation` table (D-06-11) | S6 |
| 2026-05-14 | `docs/ARCHITECTURE.md` L5, L47, L608 — 3 references to `AGENT.md` | renamed | All 3 → `CLAUDE.md`; L47 also added a `DEV_WORKFLOW.md` row in folder tree (S1/S2 didn't catch — caught during S6 verify-before-delete) | S6 |
| 2026-05-14 | `docs/prd/README.md` L36 "Theo khuyến nghị từ AGENT.md" | renamed | "Theo khuyến nghị từ CLAUDE.md" (S1 missed — caught during S6 verify-before-delete) | S6 |
| 2026-05-14 | `docs/BUGS.md` (35 fixed bugs F1–F35 + 3 doc-code inconsistency entries) | renamed | Pruned: kept 4 active bugs + 10 recent fixed (F26–F35); F1–F25 archived as 1-line summary pointing to git log + reports/; removed entire "Doc–Code Inconsistencies" section (all 3 resolved in S2); removed strikethrough Tracking Notes from 2026-03-12 (C9, D-06-08) | S6 |
| 2026-05-14 | `docs/ARCHITECTURE.md` L63-65 folder tree (3 rows: FE_SETUP.md, FE_CONVENTIONS.md, FE_PAGE_INVENTORY.md) | merged_into | Single row `FRONTEND.md` in folder tree (post-S5 reality) (D-07-01) | S7 |
| 2026-05-14 | `docs/IMPL_PLAN.md` L802 pointer `docs/FE_CONVENTIONS.md` | renamed | `docs/FRONTEND.md` §2 — Catalog Route Group Pattern (D-07-02) | S7 |
| 2026-05-14 | `docs/IMPL_PLAN.md` L898 pointer `docs/FE_CONVENTIONS.md` Catalog Route Group Pattern | renamed | `docs/FRONTEND.md` §2 — Catalog Route Group Pattern section (D-07-03) | S7 |
| 2026-05-14 | `openmemory.md` L147 pointer `docs/FE_CONVENTIONS.md` Catalog Route Group Pattern | renamed | `docs/FRONTEND.md` §2 — Catalog Route Group Pattern section (D-07-04) | S7 |
| 2026-05-14 | `docs/prd/README.md` Feature Index Status column (9/10 rows `Planned`) | renamed | 9 rows → `✅ Shipped (Slice N)`; row 09 unchanged (`⚠️ Deferred`) (D-07-05) | S7 |
| 2026-05-14 | `docs/STATUS.md` L47 + `openmemory.md` L92 — Slice 4 narrative naming 3 FE doc files | added | Parenthetical "— later merged into `docs/FRONTEND.md` by doc normalization 2026-05-14" appended to both (D-07-06) | S7 |
| 2026-05-14 | `docs/normalization/LEDGER.md` Entries table | renamed | Removed "Commit" column (never populated correctly; git log preserves commit info); column count 6→5 (D-07-07) | S7 |
| 2026-05-14 | `docs/normalization/README.md` "Kế hoạch session" table — S1/S2/S3 missing ✅ markers | added | ✅ markers added to S1/S2/S3/S7 rows; visual consistency across all 8 sessions (D-07-08) | S7 |

---

## Quick lookup helpers

### File-level changes

| Old file | Action | New location | Session |
|---|---|---|---|
| `docs/API_ROUTE_MAPPING.md` | merged_into | `docs/API.md` §6 Route Migration / Legacy | S3 |
| `docs/TEAM_PLAN.md` | archived | `docs/reports/2026-03-12_team-plan-snapshot.md` | S4 |
| `docs/RELEASE_CHECKLIST_SLICE5_8.md` | removed | (gone — Slice 5 & 8 shipped; git log preserves content) | S4 |
| `docs/FE_SETUP.md` | merged_into | `docs/FRONTEND.md` §1 Setup | S5 |
| `docs/FE_CONVENTIONS.md` | merged_into | `docs/FRONTEND.md` §2 Conventions | S5 |
| `docs/FE_PAGE_INVENTORY.md` | merged_into | `docs/FRONTEND.md` §3 Page Inventory | S5 |
| `AGENT.md` | merged_into | `CLAUDE.md` (root; Claude Code auto-loads — files were 100% identical) | S6 |

### Heading-level changes

| Old heading | Old file | New heading | New file | Session |
|---|---|---|---|---|
| `## Index of Open Questions` | `docs/DECISIONS.md` | `## Decision Index (all)` | `docs/DECISIONS.md` | S1 |
| `## CRITICAL Block Issues (Discovered 2026-03-24)` | `docs/DECISIONS.md` | `## Slice 1 Critical Block History (Discovered 2026-03-24, all RESOLVED)` | `docs/DECISIONS.md` | S1 |
| `## OPEN Questions` | `docs/DECISIONS.md` | `## Slice 1 Infrastructure Decisions (all RESOLVED)` | `docs/DECISIONS.md` | S1 |
| `## 4.3 Slice 6 — Challenge (CTF)` (Planned, contained Active sub-tables) | `docs/API.md` | `## 4.3 Slice 6 — Challenge (GitLab sync, Task 6.8)` (Planned, only sync-gitlab); content moved to §3.5 | `docs/API.md` | S3 |
| `## 6. Error and Security Notes` (was §6) | `docs/API.md` | `## 7. Error and Security Notes` (renumbered) | `docs/API.md` | S3 |
| `## 7. Change Control` (was §7) | `docs/API.md` | `## 8. Change Control` (renumbered) | `docs/API.md` | S3 |
