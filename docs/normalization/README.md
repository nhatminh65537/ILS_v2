# Documentation Normalization — Workflow & Consolidation Map

> Đây là điều phối cho đợt **normalize + consolidate** tài liệu sống của ILS v2.
> Plan tổng nằm ở `~/.claude/plans/oke-ho-n-th-nh-fancy-chipmunk.md` (local).
> File này là phiên bản trong repo, dùng làm tham chiếu cho mọi session sau.

---

## Mục tiêu

1. **Giảm số file live docs** từ 31 → ~25.
2. Đưa các file còn lại về trạng thái nhất quán nội bộ (doc-to-doc).
3. Đối chiếu doc với code thực tế (doc-to-code).
4. Thiết lập kỷ luật chỉnh sửa để không tái phát nợ kỹ thuật.

---

## Nguyên tắc bất khả xâm phạm

1. **Con người là quyết định cao nhất.** Tier hierarchy / conflict resolution rules trong `AGENT.md`/`CLAUDE.md` chỉ là gợi ý heuristic — **không tự động áp dụng**. Mỗi xung đột phải user duyệt từng item.
2. **Không miễn trừ cho meta docs.** `AGENT.md`/`CLAUDE.md` cũng có thể bị thay đổi nếu mâu thuẫn với code/doc khác.
3. **Drift report trước, sửa sau.** Mỗi session: survey → drift report dạng discussion ticket → user duyệt từng item → mới apply. Không "auto-apply".
4. **Mọi rename/move/xoá phải ghi LEDGER.** Để reports cũ trong `docs/reports/` (~70 file) vẫn truy ngược được.

---

## Consolidation Map (đã chốt)

| # | Quyết định | Trạng thái |
|---|---|---|
| C1 | **Merge AGENT.md → CLAUDE.md.** Giữ `CLAUDE.md` (Claude Code auto-loads), xoá `AGENT.md`. | ✅ Applied (Session 6, 2026-05-14) → AGENT.md deleted; references swept across CLAUDE.md, README.md, DEV_WORKFLOW.md, openmemory.md, ARCHITECTURE.md, prd/README.md |
| C2 | **Giữ riêng `DEV_WORKFLOW.md`** (audience: developer humans, không gộp vào CLAUDE.md). | Quyết — không thay đổi |
| C3 | **Merge `docs/API_ROUTE_MAPPING.md` → `docs/API.md`.** | ✅ Applied (Session 3, 2026-05-14) |
| C4 | **Archive `docs/TEAM_PLAN.md` → `docs/reports/`.** Đổi tên với prefix ngày. | ✅ Applied (Session 4, 2026-05-14) → `docs/reports/2026-03-12_team-plan-snapshot.md` |
| C5 | **Xoá hẳn `docs/RELEASE_CHECKLIST_SLICE5_8.md`** (Slice 5 & 8 đã ship). | ✅ Applied (Session 4, 2026-05-14) |
| C6 | **Merge `FE_SETUP.md` + `FE_CONVENTIONS.md` + `FE_PAGE_INVENTORY.md` → `docs/FRONTEND.md`** (3 sections). | ✅ Applied (Session 5, 2026-05-14) → `docs/FRONTEND.md` |
| C7 | **Giữ riêng `docs/STATUS.md`** (high-churn, tách khỏi IMPL_PLAN). | Quyết — không thay đổi |
| C8 | **Giữ nguyên 11 PRDs trong `docs/prd/`** (mỗi PRD = 1 feature). PRD 09 thêm header DEFERRED. | ✅ Applied (Session 1, 2026-05-04) |
| C9 | **Prune `docs/BUGS.md`** — giữ active + 5–10 fixed gần nhất. | ✅ Applied (Session 6, 2026-05-14) → 4 active + 10 recent fixed; F1–F25 archived as 1-line summary; doc-code inconsistency section removed |
| C10 | **Giữ nguyên `openmemory.md`** (MCP-managed). | Quyết — không thay đổi (Session 6 cleanup chỉ resync stale refs, không thay vai trò) |
| C11 | **Giữ + refresh `README.md`** (entry-point cho contributor mới sau Slice 0–9, 11 đã ship). | ✅ Applied (Session 6, 2026-05-14) |

**Tổng giảm:** -4 file (AGENT, API_ROUTE_MAPPING, TEAM_PLAN, RELEASE_CHECKLIST) -2 file (FE merge: 3→1) = **–6 file**.
**Live docs sau normalize:** 31 → 25.

---

## Workflow mỗi session

```
Survey  →  Drift report  →  User review từng item  →  Apply  →  Cập nhật LEDGER
(read)    (NN-...drift.md)   (chat / annotate)         (edit)    (LEDGER.md)
```

### Format drift report (mỗi item)

```markdown
### D-NN-XX  <tên ngắn>
- **Hiện trạng:** <doc/file:line — quote ngắn>
- **Conflict:** <1–2 câu giải thích bất nhất>
- **Severity:** critical / major / minor / cosmetic
- **Phương án:**
  - A. <option 1>
  - B. <option 2>
  - C. <option 3>
- **Recommend:** <A|B|C> vì <lý do>
- **Cần user quyết:** [ ] chưa duyệt
```

Sau khi user duyệt, đổi `[ ] chưa duyệt` → `[x] applied`.

---

## Kế hoạch session (7 session)

| Session | Scope chính | File tạo | File giảm |
|---|---|---|---|
| **0** | Setup ledger + duyệt consolidation map | `docs/normalization/README.md`, `LEDGER.md` | 0 |
| **1** | Tier 1: REQUIREMENTS, PRDs, DECISIONS | `01-tier1-drift.md` ✅ | 0 ✅ |
| **2** | Tier 2: DATA_MODEL, CONFIG, ARCHITECTURE | `02-tier2-drift.md` ✅ | 0 ✅ |
| **3** | Tier 3: API + apply C3 | `03-tier3-drift.md` ✅ | –1 (C3) ✅ |
| **4** | Tier 4: Plan/status + apply C4, C5 | `04-tier4-drift.md` ✅ | –2 (C4, C5) ✅ |
| **5** | Tier 5: Frontend + apply C6 | `05-tier5-drift.md` ✅ | –2 (C6) ✅ |
| **6** | Meta + Bugs + apply C1, C9, C11 | `06-meta-drift.md` ✅ | –1 (C1) ✅ |
| **7** | Cross-cutting final pass | `07-final-drift.md` + `07-final.md` ✅ | 0 ✅ |

---

## Cách bắt đầu session sau

User nói: **"Tiếp tục normalize: Session N — <topic>"**.

Mỗi session, agent sẽ:
1. Đọc `README.md` (file này) + `LEDGER.md` + drift report các session trước (nếu liên quan).
2. Survey scope theo bảng "Kế hoạch session".
3. Sinh drift report tại `docs/normalization/NN-<topic>-drift.md`.
4. Chờ user duyệt từng item.
5. Apply + cập nhật LEDGER + mark `[x] applied` trong drift report.
