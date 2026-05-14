# Documentation Normalization — Final Summary

**Period:** 2026-05-04 → 2026-05-14 (8 sessions, 11 ngày calendar)
**Author:** AI doc-normalization agent + human (final decision authority)
**Authoritative plan:** `~/.claude/plans/oke-ho-n-th-nh-fancy-chipmunk.md` (local) → mirrored to `docs/normalization/README.md`.

---

## TL;DR

Đợt normalize gồm 8 session (S0–S7) đã hoàn thành toàn bộ mục tiêu:

- **File reduction:** 31 → 26 live docs (–5 net; –7 file đi, +2 file mới — FRONTEND.md và LEDGER.md/README.md).
- **Drift fix:** 96 discussion ticket được duyệt và apply (D-01-01 … D-07-08).
- **LEDGER:** 53 entry truy ngược cho mọi rename/move/merge/removed.
- **Code-doc sync:** 2 migrations + 1 ORM refactor sinh ra từ S2.
- **Mọi quyết định đều có user duyệt** — không có auto-apply.

---

## 1. File-level changes

### File đã xoá / merge

| File cũ | Action | Đích | Session |
|---|---|---|---|
| `AGENT.md` (root) | merged_into | `CLAUDE.md` (root) | S6 (C1) |
| `docs/API_ROUTE_MAPPING.md` | merged_into | `docs/API.md` §6 Route Migration / Legacy | S3 (C3) |
| `docs/TEAM_PLAN.md` | archived | `docs/reports/2026-03-12_team-plan-snapshot.md` | S4 (C4) |
| `docs/RELEASE_CHECKLIST_SLICE5_8.md` | removed | (git log preserves) | S4 (C5) |
| `docs/FE_SETUP.md` | merged_into | `docs/FRONTEND.md` §1 Setup | S5 (C6) |
| `docs/FE_CONVENTIONS.md` | merged_into | `docs/FRONTEND.md` §2 Conventions | S5 (C6) |
| `docs/FE_PAGE_INVENTORY.md` | merged_into | `docs/FRONTEND.md` §3 Page Inventory | S5 (C6) |

### File mới tạo

| File | Vai trò |
|---|---|
| `docs/FRONTEND.md` | Survivor sau merge của 3 FE doc; 3 sections (Setup / Conventions / Page Inventory). |
| `docs/normalization/README.md` | Workflow doc + consolidation map (canonical trong repo). |
| `docs/normalization/LEDGER.md` | Truy ngược cho reports cũ; 53 entry. |
| `docs/normalization/01-tier1-drift.md` … `07-final-drift.md` | 7 discussion-ticket drift reports. |
| `docs/normalization/07-final.md` | File này. |

### Numerical breakdown

```
Start:  31 live docs
  - 7 files removed/merged
  + 2 net new live files (FRONTEND.md + LEDGER.md)
       (other normalization files đếm nội bộ, không thuộc live doc inventory)
End:    26 live docs
```

---

## 2. Session log

| # | Date | Scope | Drift items | LEDGER entries |
|---|---|---|---|---|
| **S0** | 2026-05-04 | Setup ledger + walk consolidation map C1–C11 | — (setup) | 0 |
| **S1** | 2026-05-04 | Tier 1: REQUIREMENTS, PRDs, DECISIONS | 6 (D-01-01 … D-01-06) | 10 |
| **S2** | 2026-05-04 | Tier 2: DATA_MODEL, CONFIG, ARCHITECTURE | 20 (D-02-01 … D-02-20) | 19 (+2 code/migration) |
| **S3** | 2026-05-14 | Tier 3: API + merge API_ROUTE_MAPPING (C3) | 16 (D-03-01 … D-03-16) | 13 |
| **S4** | 2026-05-14 | Tier 4: Plan/status + archive TEAM_PLAN (C4) + remove RELEASE_CHECKLIST (C5) | 13 (D-04-01 … D-04-13) | 13 |
| **S5** | 2026-05-14 | Tier 5: Frontend + merge 3 FE → FRONTEND.md (C6) | 7 (D-05-01 … D-05-07) | 8 |
| **S6** | 2026-05-14 | Meta + BUGS + merge AGENT → CLAUDE (C1) + prune BUGS (C9) + refresh README (C11) | 11 (D-06-01 … D-06-11) | 14 (incl. sweep refs across 6 root/docs files) |
| **S7** | 2026-05-14 | Cross-cutting final pass | 8 applied (D-07-01 … D-07-08) + summary (D-07-09) | 8 |
| **Total** | | | **~96 tickets, all applied** | **53 entries** |

---

## 3. Live docs inventory (final state, 26 files)

### Root (4)

| File | Vai trò |
|---|---|
| `CLAUDE.md` | AI agent quick-reference (absorbs former AGENT.md after S6/C1). |
| `README.md` | Entry point cho contributor mới (refreshed S6/C11). |
| `DEV_WORKFLOW.md` | Developer human workflow guide. |
| `openmemory.md` | OpenMemory MCP project index. |

### docs/ (10)

| File | Vai trò | Tier |
|---|---|---|
| `REQUIREMENTS.md` | Genesis doc — basic ideas. | T1 |
| `prd/` directory (12 file, see below) | Detailed feature specs. | T1 |
| `DECISIONS.md` | Decision log (Currently Open + RESOLVED). | T1 |
| `DATA_MODEL.md` | Authoritative entity types, schema, business rules. | T2 |
| `CONFIG.md` | system_config canonical keys. | T2 |
| `ARCHITECTURE.md` | System design, folder tree, data flows. | T2 |
| `API.md` | Canonical API ref + route migration §6 (absorbs former API_ROUTE_MAPPING). | T3 |
| `IMPL_PLAN.md` | Vertical slice plan with ✅ COMPLETED markers. | T4 |
| `STATUS.md` | High-churn status tracker. | T5 |
| `BUGS.md` | Pruned bug tracker (4 active + 10 recent fixed). | T5 |
| `FRONTEND.md` | FE setup + conventions + page inventory (absorbs 3 former FE doc). | T5 |

### docs/prd/ (12 file)

`README.md` (refreshed Status column S7/D-07-05) + 10 PRD files (`01-authentication.md` … `10-system-config.md`). PRD 09 (AI Assistant) marked `⚠️ Deferred`.

### docs/normalization/ (8 file — meta, không thuộc live doc inventory chính)

`README.md`, `LEDGER.md`, `01-tier1-drift.md`, `02-tier2-drift.md`, `03-tier3-drift.md`, `04-tier4-drift.md`, `05-tier5-drift.md`, `06-meta-drift.md`, `07-final-drift.md`, plus this file (`07-final.md`).

---

## 4. Code changes triggered by doc normalization (S2)

| File | Change | Trigger |
|---|---|---|
| `backend/api/models.py` Lesson | Added `status` field + Status TextChoices + DB index + default `draft` | D-02-01 |
| `backend/api/models.py` UserPermission | Base class `FullAudit` → `CreateAudit` (drop `updated_*`) | D-02-04 |
| `backend/api/migrations/0009_lesson_status_userpermission_createaudit.py` | New migration | D-02-01, D-02-04 |
| `backend/api/views/users.py` (~L89-95) | Removed deprecated `@action profile` + `@action update_profile` aliases | D-03-04 |

---

## 5. Verification (post S7)

- [x] Stale-ref audit on live docs: 0 broken pointer remaining sau S7 fixes.
- [x] Broken-anchor audit on `DECISIONS.md` heading renames: không có dangling reference.
- [x] "Phase 3" leftover in live docs: 0 occurrence.
- [x] Terminology audit: không inconsistent variant trên `challenge/quiz/flag/member/JWT/WebSocket/frontend`.
- [x] Spot-check 5 reports cũ random: 1 ref đến `AGENT.md` (jwt-refresh) trace qua LEDGER `Quick lookup helpers` → `CLAUDE.md`. LEDGER hoạt động đúng mục tiêu.
- [x] `docs/normalization/README.md` Consolidation Map: 11/11 quyết định Applied hoặc "không thay đổi".
- [x] LEDGER có entry cho mỗi rename/move/merge/removed; cột Commit đã loại (git log canonical).
- [x] PRD 09 status `⚠️ Deferred` ở cả `prd/README.md` lẫn `prd/09-ai-assistant.md` lẫn `IMPL_PLAN.md` lẫn `STATUS.md` Deferred Features.
- [x] Tất cả drift report `[x] applied` markers.

---

## 6. Kỷ luật chỉnh sửa tài liệu sau normalize (forward-looking)

Để tránh tái phát nợ kỹ thuật, các session sau (slice mới, bugfix, refactor) phải tuân theo:

1. **Document Dependency Tree** trong `CLAUDE.md` §Document Dependency Tree — biết file nào parent, file nào dependent.
2. **Propagation rule** — sửa parent doc → review/update tất cả dependent doc trong cùng session (hoặc tạo "Doc normalization" task trong `docs/STATUS.md` defer).
3. **Conflict winners** — bảng "Conflict Resolution Rules" trong CLAUDE.md là gợi ý; xung đột lớn vẫn cần human duyệt (đặc biệt khi liên quan AGENT/CLAUDE meta).
4. **LEDGER bắt buộc** — bất kỳ rename / move / merge / xoá heading hoặc file nào trong live docs phải append 1 row vào `docs/normalization/LEDGER.md`. Format ghi rõ trong header LEDGER file.
5. **Sessions report** — sau mỗi implementation session, vẫn viết `docs/reports/YYYY-MM-DD_*.md` như cũ. Không đụng vào reports cũ (lịch sử bất biến).

---

## 7. Open follow-ups (post-normalize, không trong scope đợt này)

- **Pending features** (đã đánh dấu rõ trong IMPL_PLAN + STATUS, không phải drift):
  - Task 5.8 — Outline Sync (low priority, `📋 PENDING`).
  - Task 6.8 — GitLab Sync (low priority, `📋 PENDING`).
- **Deferred:** Slice 10 — AI Assistant. PRD 09 + IMPL_PLAN + STATUS đều có header DEFERRED nhất quán.
- **Audit dead system_config keys** (Session 2 added task to STATUS Doc Normalization Follow-ups).
- **TEMP/INSECURE endpoint** `POST /api/users/` (D-03-13) — flagged trong API.md với follow-up note.

---

## 8. Pointer index

| Bạn muốn tìm gì? | Đi đến |
|---|---|
| Plan tổng đợt normalize | `docs/normalization/README.md` |
| Đối chiếu reports cũ với live doc hiện tại | `docs/normalization/LEDGER.md` |
| Quyết định cho từng item của 1 session | `docs/normalization/NN-*-drift.md` |
| Document Dependency Tree | `CLAUDE.md` §Document Dependency Tree |
| Bảng "Conflict Resolution Rules" | `CLAUDE.md` §Conflict Resolution Rules |
| Update Propagation Guide | `CLAUDE.md` §Update Propagation Guide |
| Lịch sử implementation per slice | `docs/reports/*.md` (~70 file, bất biến) |

---

*Hoàn thành 2026-05-14. Live docs hiện ở trạng thái nhất quán; mọi rename/merge truy ngược được qua LEDGER.*
