# Session 1 — Tier 1 Drift Report

**Scope:** `docs/REQUIREMENTS.md`, `docs/prd/*.md` (11 file), `docs/DECISIONS.md`
**Code references:** `backend/api/models.py`, `backend/backend/settings.py`, `backend/api/management/commands/seed_config.py`, `backend/api/services/instance_service.py`, `backend/auth_app/urls.py`
**Generated:** 2026-05-04 (Session 1 survey)
**Applied:** 2026-05-04 — **7/7 tickets** (D-01-07 = no-action per recommend B; 6 tickets sửa file)

---

## Tóm tắt

7 discussion ticket — **6 major/minor cần quyết, 1 cosmetic**. Không có ticket critical.

**Phân bố:**
- PRD 09 DEFERRED chưa được surface ở header / index / Goal section → **D-01-01** (gộp 5 finding từ 3 agent)
- 1 OPEN decision đã resolved ngầm trong code → **D-01-02**
- 1 architectural promise (Strategy pattern) ở REQUIREMENTS chưa nêu trong PRD chi tiết → **D-01-03**
- DECISIONS.md (1259 dòng) cần tinh gọn — gom RESOLVED cũ → **D-01-04**
- 1 RESOLVED decision (logout-all endpoint) chưa verify được trong code → **D-01-05**
- 1 metadata label không đồng nhất → **D-01-06**
- 1 mức chi tiết khác giữa REQUIREMENTS vs PRD (notification auto-trigger) → **D-01-07**

---

## D-01-01 — PRD 09 (AI Assistant) chưa được mark DEFERRED rõ ràng

**Hiện trạng:**
- `docs/prd/09-ai-assistant.md:4` — `**Status:** Scaffolded (needs real LLM integration)` (không nói DEFERRED)
- `docs/prd/09-ai-assistant.md:25–31` (Goal section) — liệt kê 5 implementation goals, không có deferred warning
- `docs/prd/README.md:17` — index ghi PRD 09 status `Scaffolded`
- `docs/prd/README.md:47` — implementation order list PRD 09 ở step 10 (gây hiểu nhầm sẽ build)
- `docs/REQUIREMENTS.md:245–268` — không nhắc gì tới AI Assistant (kể cả deferred)

**Conflict:**
`CLAUDE.md` và `docs/STATUS.md` nói rõ Slice 10 (AI Assistant) là DEFERRED. Nhưng PRD 09 và prd/README chưa surface điều đó → một agent / contributor mới đọc PRD trước có thể tưởng feature đang active. Quyết định Session 0 (C8): "PRD 09 thêm header DEFERRED, không đụng nội dung."

**Severity:** major

**Phương án:**
- A. Sửa toàn bộ 4 nơi cùng lúc: (1) PRD 09 header `Status: Deferred`, (2) thêm warning blockquote `> ⚠️ DEFERRED — Do not implement without explicit approval. See STATUS.md` ở đầu file, (3) prd/README status column → `Deferred`, (4) prd/README implementation order — bỏ PRD 09 khỏi danh sách number, tách thành section "Deferred features". Thêm 1 dòng vào REQUIREMENTS §2 ngắn gọn: "AI Assistant — Deferred (see STATUS.md)."
- B. Chỉ sửa header PRD 09 (status=Deferred + warning blockquote). README và REQUIREMENTS không đụng — giả định người đọc luôn check STATUS.md trước.
- C. Để nguyên — STATUS.md đã đủ truyền đạt deferral.

**Recommend:** **A** — vì plan Session 0 (C8) đã chốt mark DEFERRED, và sửa cùng lúc 4 nơi đảm bảo single message ở mọi entry point. Cost thấp (~10 dòng sửa tổng), payoff cao (loại nguy cơ hiểu nhầm).

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-02 — Q-CONFIG-01 đang OPEN nhưng đã resolved ngầm trong code

**Hiện trạng:**
- `docs/DECISIONS.md:42, 176–201` — Q-CONFIG-01 mark OPEN, mô tả 3 auth flag defaults (`local_login`, `sso_enabled`, `authorization_enabled`) là "(not yet made)"
- `backend/api/management/commands/seed_config.py:81–88` — đã seed cụ thể: `local_login=true`, `sso_enabled=false`, `authorization_enabled=true`. Khớp Option A của decision.

**Conflict:**
Code đã hiện thực Option A nhưng DECISIONS.md vẫn mark OPEN. Decision được "made implicitly" lúc finalize seed_config nhưng không update lại DECISIONS.

**Severity:** minor

**Phương án:**
- A. Mark Q-CONFIG-01 = RESOLVED (Option A), thêm reference `seed_config.py:81–88`, ngày 2026-04-15+ (commit hash khi seed_config finalize).
- B. Để OPEN, viết lý do "implicit decision, awaiting formal approval".
- C. Để OPEN, không action.

**Recommend:** **A** — code là sự thật. Khép decision với link tới code để traceability.

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-03 — Strategy pattern promise trong REQUIREMENTS chưa được PRD-04 đặc tả

**Hiện trạng:**
- `docs/REQUIREMENTS.md:151–155` — "Giao tiếp qua Strategy pattern: hiện tại dùng raw socket (yêu cầu môn học), sau hoàn thành môn có thể thay bằng HTTP/gRPC mà không sửa code gọi"
- `docs/prd/04-challenge.md:91–98` — chỉ ghi "External deploy API (cấu hình qua system_config)", không đặc tả Strategy interface, không nói gì về swapping implementation runtime
- **Lưu ý:** `backend/api/services/instance_service.py:12–65` đã hiện thực Protocol `InstanceDeploymentBackend` với `MockDeploymentBackend` (Wave 1) và placeholder cho `SocketDeploymentBackend`. Code đã làm đúng — chỉ doc chưa kịp.

**Conflict:**
REQUIREMENTS hứa kiến trúc, code đã làm, nhưng PRD-04 (tài liệu trung gian giữa hai) bỏ trống. Reader đọc PRD-04 sẽ không biết Strategy pattern tồn tại.

**Severity:** major (architectural traceability)

**Phương án:**
- A. Thêm subsection `FR-CHAL-XX: Deployment Strategy` vào PRD-04 mô tả: Protocol `InstanceDeploymentBackend`, `system_config[challenge.deploy.provider]` switch, danh sách backend hiện có (mock + socket). Reference code.
- B. Bỏ Strategy pattern khỏi REQUIREMENTS (nếu thấy không còn relevant) → "currently HTTP-only, future enhancement".
- C. Giữ nguyên — coi là implementation detail, REQUIREMENTS overview là đủ.

**Recommend:** **A** — REQUIREMENTS đã promise + code đã hiện thực; PRD là layer trung gian, nó phải bridge. Khoảng 15–25 dòng thêm vào PRD-04.

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-04 — DECISIONS.md (1259 dòng) cần gom RESOLVED cũ vào archive section

**Hiện trạng:**
- `docs/DECISIONS.md` — 1259 dòng, file nặng nhất trong docs/. ~95% decisions đã RESOLVED (spot-check 5/5 RESOLVED có code evidence). OPEN còn rất ít (Q-CONFIG-01 sau D-01-02 sẽ về 1, hoặc 0).
- Decisions RESOLVED dài (>150 dòng/decision) như Q-LEARN-08, Q-LEARN-09 chiếm phần lớn file.
- OPEN decisions bị nhấn chìm giữa biển RESOLVED → khó scan.

**Conflict:**
Mục đích DECISIONS.md là làm tracker quyết định, đặc biệt OPEN. Khi đa số đã RESOLVED, file biến thành kho lưu trữ và mất tính hữu dụng cho việc tra OPEN.

**Severity:** major (UX của doc)

**Phương án:**
- A. Tách thành 2 section trong cùng file: `## Active (OPEN + recent RESOLVED)` (giữ chi tiết) và `## Archived RESOLVED` (compact: chỉ tag + 1 dòng kết luận + ngày + commit hash; full content move xuống cuối hoặc bỏ vì git có).
- B. Tách thành 2 file: `DECISIONS.md` (chỉ active) + `DECISIONS_ARCHIVE.md` (full RESOLVED). Ghi LEDGER cho mỗi decision di chuyển.
- C. Giữ nguyên cấu trúc, chỉ thêm Table-of-Contents và status badge ở đầu mỗi entry.

**Recommend:** **A** — không tăng số file (mục tiêu Session 0 là giảm). Trong 1 file 2 section, OPEN nổi bật, archived compact. Người đọc cần full content vẫn truy git history. Giảm file size ước ~50% (từ 1259 → ~600 dòng).

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-05 — Q-AUTH-07: logout-all endpoint mark RESOLVED nhưng không verify được

**Hiện trạng:**
- `docs/DECISIONS.md:38, 80–99` — Q-AUTH-07 RESOLVED, nói "Both `DELETE /api/auth/sessions/{id}/` and `POST /api/auth/logout-all/` endpoints are implemented."
- Spot-check `backend/api/views/auth.py` không thấy view tương ứng trong scan của agent (có thể bị ẩn ở viewset khác).
- `R-ARCH-12` (line 1163) note Task 1.4 (session management) bị defer per Q-INFRA-03.

**Conflict:**
RESOLVED nhưng implementation evidence không rõ. Có thể: (a) Task 1.4 đã ship sau khi defer được mở lại, (b) decision text outdated.

**Severity:** major (truth-claim không verify được)

**Phương án:**
- A. Verify cụ thể trong session apply: grep `logout-all` trong `backend/`. Nếu có → giữ RESOLVED, thêm code reference. Nếu không → revert RESOLVED → "PARTIAL — single-session implemented, logout-all deferred".
- B. Mark UNCLEAR / NEEDS-VERIFY ngay, để session sau xử lý.
- C. Giữ RESOLVED, trust decision text.

**Recommend:** **A** — verify nhanh (1 grep). Truth-claim quan trọng, không nên trust mù.

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-06 — PRD-10 priority metadata format không chuẩn

**Hiện trạng:**
- `docs/prd/10-system-config.md:5` — `**Priority:** High (prerequisite for other features)`
- 9/10 PRD khác dùng metadata sạch (`Priority: High`, `Priority: Medium`, không có qualifier)

**Conflict:**
Format không đồng nhất → khó parse / scan tự động.

**Severity:** cosmetic

**Phương án:**
- A. Strip qualifier: `**Priority:** High`. Lý do "(prerequisite...)" nếu cần thì viết trong `## Context`.
- B. Standardize ngược: tất cả PRD thêm qualifier (dài hơn, không cần thiết).
- C. Để nguyên.

**Recommend:** **A**.

**Cần user quyết:** [x] applied (2026-05-04)

---

## D-01-07 — Notification auto-trigger: REQUIREMENTS vague, PRD-07 detailed

**Hiện trạng:**
- `docs/REQUIREMENTS.md:208–212` — "Thông báo tự động khi người dùng hoàn thành điều kiện" (vague)
- `docs/prd/07-notification.md:55–62` — đặc tả 3 auto-trigger events qua signals + idempotency

**Conflict:**
Không phải mâu thuẫn, mà PRD đã elaborate đúng intent của REQUIREMENTS. REQUIREMENTS là "basic idea", PRD là "detail" — đúng vai trò sibling.

**Severity:** minor (có thể no-action)

**Phương án:**
- A. Thêm 1 dòng "see PRD-07 for trigger event list" vào REQUIREMENTS §2.7 để rõ relationship.
- B. Để nguyên — đây là elaboration đúng vai trò, không phải drift.

**Recommend:** **B** — đây là pattern healthy giữa REQUIREMENTS và PRD, không cần "fix".

**Cần user quyết:** [x] applied (2026-05-04)

---

## Apply phase — sau khi user duyệt

Khi user đã duyệt từng item:
1. Sửa file theo quyết định.
2. Mỗi rename/move/xoá heading → append `docs/normalization/LEDGER.md`.
3. Trong file này, đổi `[ ] chưa duyệt` → `[x] applied` cho từng ticket.
4. Cuối session: thêm 1 dòng tóm tắt "Applied N/M tickets" ở đầu file.
