# Session 2 — Tier 2 Drift Report

**Scope:** `docs/DATA_MODEL.md` (917 lines) · `docs/CONFIG.md` (250 lines) · `docs/ARCHITECTURE.md` (667 lines) ↔ `backend/api/models.py`, `seed_config.py`, cấu trúc thư mục thực tế, RESOLVED decisions trong `docs/DECISIONS.md`.

**Ngày:** 2026-05-04 · **Trạng thái:** Drift report — chờ user duyệt từng item.

---

## Tóm tắt

| Cụm | Drift | Critical | Major | Minor | Cosmetic |
|---|---|---|---|---|---|
| Cụm A — DATA_MODEL ↔ models.py | 10 | 4 | 4 | 2 | 0 |
| Cụm B — CONFIG ↔ seed_config / code / DATA_MODEL §SystemConfig | 5 | 2 | 2 | 1 | 1 (đã dedup với A) |
| Cụm C — ARCHITECTURE ↔ folder tree / RESOLVED decisions | 5 | 0 | 3 | 2 | 0 |
| **Tổng** | **20** | **6** | **9** | **5** | **0/1** |

**Số liệu tổng:**
- Entities trong DATA_MODEL.md: ~50; ORM classes trong models.py: ~50; lệch lớn: ~10.
- Keys trong CONFIG.md: 48; defaults trong seed_config.py: 42; được đọc trong code: ~13; trong DATA_MODEL summary: 9.
- ARCHITECTURE.md: 14 sections; broken anchor refs: 2; missing file listings: 2; spec mismatch: 1; broken external ref: 1.

> **Lưu ý đặc biệt:** Cụm A có 1 quyết định kiến trúc lớn (D-02-05 Notification flatten 1-table vs 2-table) và 1 schema rewrite lớn (D-02-09 AuditLog) — đây không thuần "fix doc" mà cần con người chốt **design intent** trước. Đề xuất xử lý 2 item này đầu tiên, vì nó ảnh hưởng cả §SystemConfig summary và các slice trong tương lai.

---

## Cụm A — DATA_MODEL.md ↔ backend/api/models.py

### D-02-01  Lesson thiếu field `status`
- **Hiện trạng:** `docs/DATA_MODEL.md:465` định nghĩa `Lesson.status` (`content_status` enum, NOT NULL, DEFAULT `'draft'`) / `backend/api/models.py:741-787` Lesson không khai báo `status`.
- **Conflict:** Field bắt buộc theo doc nhưng không có trong ORM.
- **Severity:** critical
- **Phương án:**
  - A. Thêm `status` vào Lesson model (khớp doc + cross-cutting rule "content lifecycle" áp dụng mọi content type).
  - B. Xoá `status` khỏi DATA_MODEL.md (chấp nhận Lesson không có status).
- **Recommend:** A — DATA_MODEL §2 nói rõ "draft → published → archived" áp dụng cho course/challenge/quiz/lesson; Lesson là lý do duy nhất bị thiếu.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-02  Lesson có field thừa `video_duration`
- **Hiện trạng:** `docs/DATA_MODEL.md:456-470` không liệt kê / `models.py:776-780` có `video_duration = IntegerField(null=True, blank=True)`.
- **Conflict:** Code có field, doc không nhắc.
- **Severity:** minor
- **Phương án:**
  - A. Xoá khỏi code.
  - B. Thêm vào doc (ghi nhận nó là metadata cho lesson type=video).
  - C. Giữ nguyên — không sửa gì.
- **Recommend:** B — field hợp lý cho lesson type video; chỉ cần đồng bộ doc.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-03  LessonQuestion dùng FullAudit thay vì CreateAudit
- **Hiện trạng:** `docs/DATA_MODEL.md:213` quy tắc "Join tables use CreateAudit only" / `models.py:840` LessonQuestion kế thừa FullAudit.
- **Conflict:** Join table dùng audit type sai theo quy tắc đã đặt.
- **Severity:** major
- **Phương án:**
  - A. Đổi base class FullAudit → CreateAudit trong code (cần migration loại bỏ updated_at/updated_by).
  - B. Cập nhật doc nói LessonQuestion là exception, dùng FullAudit.
- **Recommend:** A — DATA_MODEL §2 quy tắc tổng quát; nếu LessonQuestion cần `updated_*` thì là dấu hiệu nó không đơn thuần là join table mà là entity đầy đủ → cần xem lại design (mở thảo luận).
- **Cần user quyết:** [x] **REVISED → option B applied 2026-05-04.** Dependency check: `backend/api/services/lesson_service.py:73-88` actively writes `LessonQuestion.updated_*`. LessonQuestion có field `position` mutable → carve-out: join tables với mutable state dùng FullAudit. Doc đã được update với carve-out rule, code giữ nguyên FullAudit.

---

### D-02-04  UserPermission dùng FullAudit thay vì CreateAudit
- **Hiện trạng:** `docs/DATA_MODEL.md:213` quy tắc "user_permission (join table, CreateAudit only)" / `models.py:1802` UserPermission kế thừa FullAudit.
- **Conflict:** Tương tự D-02-03.
- **Severity:** major
- **Phương án:** A. Đổi base class trong code (migration drop updated_*) / B. Cập nhật doc.
- **Recommend:** A — cùng lý do D-02-03.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-05  Notification: 2-table (doc) vs 1-table flatten (code) — design split
- **Hiện trạng:** `docs/DATA_MODEL.md:797-827` định nghĩa `notification` + `user_notification` (2 entity) / `models.py:1917-1985` chỉ có `Notification` (flatten, có `user` FK nullable cho broadcast, `is_read`, `read_at` ngay trong row).
- **Conflict:** Hai design khác nhau cho cùng feature. Code đã ship; doc chưa cập nhật.
- **Severity:** critical
- **Phương án:**
  - A. Code đúng (flatten đơn giản hơn, đã ship); rewrite doc theo code.
  - B. Doc đúng (2 bảng — broadcast 1 record, user_notification N records); rewrite code (high cost, cần migration).
  - C. Hybrid: giữ flatten code nhưng chuẩn hoá tên field theo doc (`type` → `notification_type`, `message` → `body`, `metadata` → `payload`).
- **Recommend:** A + bonus rename theo C — code đã production, flatten phù hợp với scale ~100 user. Rename field đồng thời để doc-code thống nhất naming.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-06  Notification enum values khác hoàn toàn
- **Hiện trạng:** `docs/DATA_MODEL.md:24` enum: `manual, auto_challenge_complete, auto_course_complete, auto_quiz_complete, system` / `models.py:1921-1926` `NotificationType.{SYSTEM, ACHIEVEMENT, COURSE, CHALLENGE, QUIZ}`.
- **Conflict:** Hai trục phân loại khác nhau — doc theo trigger source, code theo category.
- **Severity:** critical
- **Phương án:**
  - A. Code đúng (category-based dễ filter trong UI); update doc.
  - B. Doc đúng (trigger-source rõ về hành vi auto vs manual); rewrite code enum + signals.
  - C. Cả hai đều đúng nửa, cần thiết kế lại.
- **Recommend:** A — phân loại theo category align với UX (badge theo category trong notification bell). Auto/manual có thể tách thành field phụ `is_auto_generated:bool` nếu cần.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-07  Notification thiếu field `send_at`
- **Hiện trạng:** `docs/DATA_MODEL.md:805` có `send_at TIMESTAMPTZ nullable — scheduled send time` / `models.py:1917-1985` không có.
- **Conflict:** Field scheduling trong doc, không trong code.
- **Severity:** major
- **Phương án:**
  - A. Thêm `send_at` vào code (cần migration + scheduler).
  - B. Xoá khỏi doc — tạm thời chưa support scheduled send.
- **Recommend:** B — scheduled notification không có trong PRD-07 dạng MVP; bỏ khỏi doc, có thể thêm lại sau.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-08  Entity `user_notification` không tồn tại trong code
- **Hiện trạng:** `docs/DATA_MODEL.md:814-827` định nghĩa entity / không có UserNotification class.
- **Conflict:** Hệ quả trực tiếp của D-02-05 (flatten design).
- **Severity:** critical (auto-resolved khi D-02-05 chốt)
- **Phương án:** Theo D-02-05.A → xoá entity `user_notification` khỏi DATA_MODEL.md, ghi LEDGER.
- **Recommend:** Tied to D-02-05 decision.
- **Cần user quyết:** [x] applied 2026-05-04 (gắn với D-02-05)

---

### D-02-09  AuditLog schema rewrite hoàn toàn
- **Hiện trạng:** `docs/DATA_MODEL.md:832-848` schema `id, actor_id, event_type, target_table, target_id, diff, created_at` / `models.py:1992-2044` schema `timestamp, actor_type, actor_id, actor_username, aggregate_type, aggregate_id, action, metadata, ip_address, user_agent`.
- **Conflict:** Code chứa nhiều thông tin hơn (actor_type, ip_address, user_agent denormalized). Doc bị bỏ quên.
- **Severity:** critical
- **Phương án:**
  - A. Code đúng (audit nên rich, ip/user_agent giúp forensics); rewrite doc.
  - B. Doc đúng (schema gọn); rewrite code (high cost, mất thông tin forensics đã thu thập).
  - C. Hybrid: giữ code, rename `event_type ↔ action`, `target_* ↔ aggregate_*` cho thuật ngữ đồng nhất.
- **Recommend:** A — code thực tế chạy production, có dữ liệu. Rewrite doc bảo toàn nguyên hiện tại.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-10  User có field thừa `last_login_ip`
- **Hiện trạng:** `docs/DATA_MODEL.md:47-62` không có / `models.py:1468` `last_login_ip = GenericIPAddressField(null=True, blank=True)`.
- **Conflict:** Code có, doc không.
- **Severity:** minor
- **Phương án:** A. Xoá khỏi code / B. Thêm vào doc / C. Giữ nguyên.
- **Recommend:** B — field hữu ích cho audit/security; chỉ cần đồng bộ doc.
- **Cần user quyết:** [x] applied 2026-05-04

---

## Cụm B — CONFIG.md ↔ seed_config.py / code / DATA_MODEL §SystemConfig

### D-02-11  6 AI config keys trong CONFIG.md không có trong seed
- **Hiện trạng:** `docs/CONFIG.md:169-178` định nghĩa `ai.enabled`, `ai.provider`, `ai.model`, `ai.api_key`, `ai.base_url`, `ai.rate_limit_per_hour` / `seed_config.py` không có / không có code reader cho `ai.*` (Slice 10 deferred).
- **Conflict:** Slice 10 (AI) là DEFERRED nhưng CONFIG.md vẫn liệt kê đầy đủ → key không seed = nguy cơ runtime nếu code có lỡ đọc.
- **Severity:** critical
- **Phương án:**
  - A. Xoá 6 AI keys khỏi CONFIG.md (Slice 10 deferred → keys chưa cần).
  - B. Giữ trong CONFIG.md, thêm vào seed (đặt placeholder default, pre-stage cho khi un-defer).
  - C. Giữ CONFIG.md, thêm header `> ⚠️ DEFERRED — sẽ seed khi Slice 10 được approved`.
- **Recommend:** C — đồng nhất với cách Session 1 đã đánh dấu PRD 09 DEFERRED. Người đọc CONFIG.md sẽ hiểu rõ trạng thái mà không mất thiết kế.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-12  DATA_MODEL §SystemConfig "summary" liệt kê thiếu nghiêm trọng
- **Hiện trạng:** `docs/DATA_MODEL.md:778-791` "Known system_config keys (summary)" chỉ có 9 keys / CONFIG.md có 48 keys / seed có 42 keys. Thiếu: toàn bộ `auth.password.*`, `auth.email.*`, `auth.token.*`, `learn.*`, `cdn.*`, `system.rate_limit.*`, nhiều `challenge.*`.
- **Conflict:** Tier rule nói DATA_MODEL canonical cho schema, CONFIG.md canonical cho keys list → DATA_MODEL không cần list keys, nhưng đoạn "summary" hiện tại lỗi thời và misleading.
- **Severity:** major
- **Phương án:**
  - A. Xoá block "summary keys" khỏi DATA_MODEL.md, thay bằng 1 dòng "Toàn bộ keys: xem `docs/CONFIG.md`".
  - B. Mở rộng summary để bao gồm 42–48 keys (bảo trì 2 nơi → drift lại).
  - C. Giữ summary nhưng chỉ với 5 "core keys" + ghi rõ "đầy đủ ở CONFIG.md".
- **Recommend:** A — Single source of truth cho keys list = CONFIG.md. DATA_MODEL chỉ giữ schema entity (table columns).
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-13  `auth.password_reset_enabled` không có code reader
- **Hiện trạng:** CONFIG.md:49 + seed default `True` / grep `get_config('auth.password_reset_enabled')` → 0 match.
- **Conflict:** Key seeded nhưng không có nơi nào kiểm tra trước khi gửi password-reset email.
- **Severity:** minor
- **Phương án:**
  - A. Thêm code check ở view `password_reset` (nếu false → trả 403 / hide UI).
  - B. Xoá khỏi CONFIG + seed (feature chưa hoàn chỉnh, gỡ flag để bớt rối).
  - C. Giữ nguyên — coi như reserved cho tương lai.
- **Recommend:** A — feature đã có, chỉ thiếu honor toggle. Sửa code đúng intent của doc.
- **Cần user quyết:** [x] **REVISED → option C applied 2026-05-04.** Dependency check: không có view `password_reset` ở backend (chỉ frontend "Coming soon" stub tại `frontend/app/[locale]/(auth)/forgot-password/page.tsx`). Không có code để gate. Thay vào đó: ghi chú "Reserved" trong CONFIG.md entry để rõ trạng thái (key seeded nhưng backend chưa implement). Khi backend làm password reset, sẽ honor flag.

---

### D-02-14  Field name lệch: `config_type` (doc) vs `value_type` (code)
- **Hiện trạng:** `docs/DATA_MODEL.md:769` field `config_type` / `models.py:1872` + seed dùng `value_type`.
- **Conflict:** Tên column DB lệch giữa doc và code.
- **Severity:** cosmetic (chỉ là tên field, code và migration đã chạy ổn).
- **Phương án:**
  - A. Cập nhật DATA_MODEL.md: `config_type` → `value_type`.
  - B. Đổi code `value_type` → `config_type` (migration nặng, không cần thiết).
- **Recommend:** A — code và migration là ground truth.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-15  Một số seed keys không có code reader (broader audit)
- **Hiện trạng:** Spot-check cho thấy ngoài D-02-13, có thể nhiều seed keys khác không có nơi đọc (chưa exhaustive). Ví dụ: `learn.max_tree_depth`, `learn.max_nodes_per_course`, `system.rate_limit.*` cần verify.
- **Conflict:** Khả năng có dead config.
- **Severity:** minor (cần audit kỹ hơn)
- **Phương án:**
  - A. Mở 1 follow-up task để audit toàn bộ 42 seed keys vs grep code reader; report ở session sau.
  - B. Bỏ qua — chỉ xử lý case khám phá ngẫu nhiên (D-02-13).
- **Recommend:** A — chấp nhận "1 grep trên 42 keys" trong cuối Session 2 này hoặc đẩy thành "Session 2.5". Người dùng quyết.
- **Cần user quyết:** [x] applied 2026-05-04

---

## Cụm C — ARCHITECTURE.md ↔ folder tree / RESOLVED decisions

### D-02-16  R-DEV-01 tham chiếu sai section number
- **Hiện trạng:** `docs/DECISIONS.md:1199` "Source: `docs/ARCHITECTURE.md §4.11`" / thực tế R-DEV-01 (Authorization Bypass) thuộc ARCHITECTURE §4.12 (§4.11 = "Instance Deployment Interface").
- **Conflict:** Cross-doc anchor sai số.
- **Severity:** major (broken trace).
- **Phương án:** A. Sửa DECISIONS.md:1199 `§4.11` → `§4.12`.
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-17  R-ARCH-12 tham chiếu sai section number
- **Hiện trạng:** `docs/DECISIONS.md:1181` "Source: `docs/ARCHITECTURE.md §4.10`" / thực tế R-ARCH-12 (Instance Deployment) thuộc §4.11 (§4.10 = "Join Table Audit Fields").
- **Conflict:** Cross-doc anchor sai số.
- **Severity:** major.
- **Phương án:** A. Sửa DECISIONS.md:1181 `§4.10` → `§4.11`.
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-18  ARCHITECTURE.md mô tả `permission_code` attribute, code dùng `permission_key` constructor param
- **Hiện trạng:** `docs/ARCHITECTURE.md:222` "Optional override via `permission_code` attribute on view" / `auth_app/permissions.py:107,112-114` thực tế là `HasJWTPermission(permission_key='api.role.list')` truyền vào constructor trong `permission_classes`.
- **Conflict:** Doc mô tả API sai → developer làm theo doc sẽ code không chạy.
- **Severity:** major.
- **Phương án:**
  - A. Sửa ARCHITECTURE.md:222 thành `Optional override via HasJWTPermission('explicit.key') in permission_classes`.
  - B. Đổi code thêm `permission_code` attribute để khớp doc (tăng cost, không cần).
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-19  ARCHITECTURE.md tham chiếu file không tồn tại `requirements.docx`
- **Hiện trạng:** `docs/ARCHITECTURE.md:183` "See `requirements.docx` Q1-Q9 in section 2.2" / file không có trong repo (chỉ có `REQUIREMENTS.md`); Q-AUTH-* hiện được track ở DECISIONS.md.
- **Conflict:** Tham chiếu đến file không tồn tại.
- **Severity:** minor (broken external ref).
- **Phương án:**
  - A. Sửa thành `See docs/DECISIONS.md — Decision Index và các Q-AUTH-* / R-ARCH-* entries`.
  - B. Xoá hẳn dòng nếu không còn cần thiết.
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-04

---

### D-02-20  ARCHITECTURE.md liệt kê thiếu 2 view files
- **Hiện trạng:** `docs/ARCHITECTURE.md:101-112` listing `api/views/` không có `admin_stats.py` và `challenge_nodes.py`; thư mục thực tế có 14 files.
- **Conflict:** Listing không đầy đủ — gây hiểu nhầm về phạm vi backend.
- **Severity:** minor.
- **Phương án:**
  - A. Bổ sung 2 dòng vào listing.
  - B. Tổng quát hoá listing bằng `...` cho gọn.
- **Recommend:** A — listing kiểu này chỉ hữu ích khi đầy đủ.
- **Cần user quyết:** [x] applied 2026-05-04

---

## Đề xuất thứ tự duyệt

1. **Duyệt sớm các quyết định kiến trúc** ảnh hưởng schema: **D-02-05 (Notification flatten)**, **D-02-06 (enum trục)**, **D-02-09 (AuditLog rewrite)**. 3 quyết định này sẽ dẫn đến nhiều edit DATA_MODEL.
2. **Duyệt batch quy tắc audit base class:** **D-02-03, D-02-04** — 2 cùng tính chất, chốt 1 lần.
3. **Duyệt quy tắc CONFIG sources:** **D-02-11 (AI deferred header), D-02-12 (xoá DATA_MODEL summary keys)** — 2 cùng tinh thần "single source".
4. **Duyệt batch fix nhỏ ARCHITECTURE/DECISIONS:** **D-02-16, D-02-17, D-02-18, D-02-19, D-02-20** — chấp nhận tất cả Recommend = `A` để gọn.
5. **Còn lại:** **D-02-01, D-02-02, D-02-07, D-02-08, D-02-10, D-02-13, D-02-14, D-02-15** — quyết riêng từng item.

---

## Sau khi duyệt

Khi user xong duyệt, tôi sẽ:
1. Apply theo đúng quyết định.
2. Cập nhật `docs/normalization/LEDGER.md` cho mọi rename / move / xoá.
3. Đánh dấu `[x] applied` + commit hash cho mỗi item trong file này.
