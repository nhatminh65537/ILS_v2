# ILS v2 — Yêu cầu hệ thống

> **Phiên bản gốc:** `requirements.docx`
> **Trạng thái:** Tài liệu làm việc — cập nhật khi có thay đổi

---

## 1. Phạm vi và đối tượng sử dụng

- Phục vụ một nhóm nhỏ (~100 thành viên)
- Self-hosted là chính, không phục vụ đông người
- Một instance tương ứng một tổ chức, không cần mở rộng ngang (horizontal scale)

### Vai trò người dùng

| Vai trò | Mô tả |
|---------|-------|
| **Admin** | Toàn quyền cấu hình hệ thống và tiếp cận tài nguyên |
| **Editor** | Quyền chỉnh sửa nội dung trên trang web |
| **Member** | Xem nội dung trên trang web |

---

## 2. Yêu cầu chức năng

### 2.1. Authentication

- Hỗ trợ SSO với **Authentik** (mở rộng Google và các nền tảng khác nếu có thể)
  - Tham khảo: [goauthentik/authentik](https://goauthentik.io)
  - Đăng nhập lần đầu sẽ tự động tạo dữ liệu người dùng trên hệ thống
- Hỗ trợ đăng nhập, đăng ký, đổi mật khẩu, quên mật khẩu trên nền tảng
- Có thể liên kết tài khoản nội bộ với tài khoản SSO

**Cấu hình Admin:**
- Enable/disable từng phương thức xác thực (ví dụ: chỉ cho phép SSO)
- Cấu hình cho phép liên kết tài khoản hay chỉ cho phép một phương thức duy nhất
- Cấu hình email hệ thống (dùng để gửi reset password)
- Secret config mặc định bị che; chỉ người có quyền thủ công `system.config.view_secret` mới xem được clear value

---

### 2.2. Authorization

**Thiết kế:**
- **API-based authorization** (không phải resource-based) — phù hợp với quy mô nhỏ, người dùng được truy cập mọi tài nguyên đã publish
- **Permission-based / Scope-based (fine-grained RBAC):**
  - Mỗi API endpoint tương ứng một permission
  - Role là tập hợp các permission
  - Permission là **flat** (không phân cấp) — roles cung cấp nhóm quyền
- **Token-based permission check (JWT claims):** encode permission dưới dạng binary bitmap (base64) vào token, kiểm tra tại server

**Cơ chế vận hành:**
- Permission được tạo tự động khi khởi động — scan toàn bộ endpoint bằng metaprogramming
- Permission name tự động sinh theo format lowercase: `{app_label}.{resource_name}.{handler_method_name}`
  - `resource_name`: lấy từ class name sau khi bỏ hậu tố `ViewSet`/`View`/`APIView`/`GenericViewSet`, rồi normalize snake_case
  - `handler_method_name`: tên method Python xử lý endpoint (`list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`, custom action hoặc `get`/`post`...)
- Permission không thể xóa dù là admin; khi xóa API và restart, permission đó bị đánh dấu `is_active=FALSE`
- Permission là **read-only** qua API — admin không thể tạo/sửa/xóa permission
- Encode permission dưới dạng **bitmap nhị phân** (≤256 permissions = 32 bytes → base64 ≈ 44 ký tự)
- Mỗi permission `id` tương ứng một bit position; bit = 1 → có quyền
- Cache encoded bitmap của user trong database (`user_permission_cache`); version **per-user** (không global)
- Quyền trực tiếp (deny) của user ưu tiên hơn quyền từ role — chỉ có deny override, không có grant override
- Entry trong `user_permission` chỉ tồn tại nếu user đã có quyền đó qua role (deny entries hợp lệ)

**Built-in roles:**
- Sử dụng decorator `@add_role_granted('Admin', 'Editor', 'Member')` trên mỗi endpoint
- Các role được scan tự động từ decorator và tạo khi khởi động (idempotent)
- Built-in roles (`is_system=TRUE`) không thể xóa/sửa permissions qua API
- Admin có thể tạo custom roles (`is_system=FALSE`) với full management qua API

**Admin có thể:**
- Tạo custom role, gán permissions vào custom role
- Gán user vào role (cả built-in và custom)
- Gán deny permission trực tiếp cho user (override role)

**Các câu hỏi thiết kế (đã chốt):**

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Resource-based hay API-based? | API-based |
| Q2 | Tổ chức permission như thế nào? | Fine-grained RBAC — flat, không phân cấp; roles nhóm quyền |
| Q3 | Cơ chế kiểm tra? | JWT claims — binary bitmap base64 |
| Q4 | Đánh đổi thời gian revoke vs check? | Bitmap encode nhanh O(1) check, version per-user invalidate khi cần |
| Q5 | Update quyền realtime với JWT? | Không — có hiệu lực khi refresh token |
| Q6 | Permission tạo khi nào? Có thể xóa không? | Runtime scan, không xóa được, read-only qua API |
| Q7 | Cần cache check permission? | Bitmap cache trong DB + JWT, check O(1) |
| Q8 | Tăng tốc revoke token? | Cache bitmap trong DB, version per-user, rebuild khi mismatch |
| Q9 | Thứ tự ưu tiên quyền? | Direct deny > role grant |
| Q10 | Permission hierarchy? | Không — flat permissions, roles nhóm quyền |
| Q11 | Permission naming? | Auto-generated: `{app_label}.{resource_name}.{handler_method_name}` (lowercase) |

---

### 2.3. Bài học (Learn)

**Tổ chức nội dung:**
- Course → nhiều folder (có thể lồng nhau) + lesson
- Folder và lesson có thứ tự và tên
- Course có: category, tag, learning point (lpoint), filter theo các trường, tìm kiếm theo tên
- Course và lesson đều có **trạng thái**: draft / published / archived

**Loại bài học (lesson):**
- Văn bản (Markdown)
- Video (có thể embed qua Markdown)
- Mini-quiz (nhúng vào trang)

**Tạo nội dung:**
- Tạo thủ công qua editor
- Hoặc chọn từ [Outline](https://github.com/outline/outline) — dùng làm nơi edit và lưu trữ tài nguyên
- Frontend không gọi Outline trực tiếp; backend gọi Outline rồi chuẩn hóa dữ liệu trả về frontend

**Progress:**
- Bắt đầu bài học bằng hành động explicit (nút Start)
- Đánh dấu hoàn thành theo cơ chế hybrid: có trigger hướng dẫn (ví dụ scroll/video) và vẫn có hành động complete tường minh
- Lưu trạng thái user + course và danh sách lesson hoàn thành (user + lesson): trạng thái, thời gian bắt đầu, thời gian kết thúc
- Khi cấu trúc course thay đổi, progress được tính theo cơ chế versioned lazy recompute theo từng user-course (không quét lại toàn bộ user)

**Admin có thể:**
- Cấu hình độ sâu tối đa của cây bài học
- Cấu hình cách upload tài liệu
- Cấu hình tài khoản Outline

**Không làm:** comment, note, rating

**Các câu hỏi thiết kế (đã chốt):**

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Bài học được load như thế nào? | Load cây lazy (mở rộng theo yêu cầu), `parent_id` filter cho direct children |
| Q2 | Giải quyết N+1 query trong load cây? | Dot-separated path (`path` field, e.g. `1.3.10`), lazy load chính, subtree query cho validate |
| Q3 | Lesson có status không? | Có — draft/published/archived, giống course |

---

### 2.4. Thử thách (Challenge)

**Tổ chức nội dung:**
- Cấu trúc folder + challenge (tương tự course), có folder root làm gốc
- Challenge có: category, tag, challenge point (cpoint), độ khó, filter
- Trạng thái: draft / published / archived

**Nhập nội dung:**
- Tạo thủ công
- Import từ **GitLab** — mỗi bài CTF là một project gồm metadata, file bài làm, code deploy; có nút sync lại khi cần update; load README khi click vào challenge

**Submit flag:**
- Check flag phía server
- Đánh dấu hoàn thành, lưu lịch sử làm bài của người dùng
- Flag case-sensitive có thể cấu hình, hỗ trợ nhiều flag (phù hợp bài OSINT)

**Deployable challenges:**
- Người dùng có thể yêu cầu khởi tạo instance (mỗi người một instance)
- Hệ thống tạo instance là **project riêng** (không thuộc phạm vi dự án này) — ILS chỉ định nghĩa **interface** giao tiếp
- Giao tiếp qua **Strategy pattern**: hiện tại dùng raw socket (yêu cầu môn học), sau hoàn thành môn có thể thay bằng HTTP/gRPC mà không sửa code gọi
- Sử dụng khi kết hợp với GitLab

**Admin có thể:**
- Enable/disable tính năng deployable
- Cấu hình kết nối server tạo instance và GitLab
- Cấu hình flag (riêng hay chung mỗi instance)
- Kill instance
- Xem lịch sử khởi tạo instance

**Không làm:** hint system, discussion, writeup submission

**Các câu hỏi thiết kế (đã chốt):**

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Cơ chế instance? | Mỗi user một instance riêng; giao tiếp qua Strategy pattern (socket → HTTP/gRPC) |
| Q2 | Import GitLab như thế nào? | Sync metadata + README; nút sync thủ công khi update |
| Q3 | Instance system thuộc phạm vi dự án? | Không — ILS chỉ định nghĩa interface, implementation là external |

---

### 2.5. Luyện tập (Quiz)

**Tổ chức nội dung:**
- Cấu trúc folder + quiz (tương tự challenge)
- Quiz có: category, tag, quiz point; filter
- Quiz và quiz_question đều có **trạng thái**: draft / published / archived

**Loại câu hỏi:**
- Single choice
- Multi choice — chỉ tính điểm khi chọn đúng tất cả đáp án
- Fill in the blank
- Case-sensitive cấu hình được trên từng câu hỏi

**Trải nghiệm làm bài:**
- Thực hành theo kiểu: answer → check → next (sử dụng **WebSocket**)
- WebSocket xác thực bằng first-message auth (không truyền JWT trong query string)
- Người dùng cấu hình bài thực hành (lưu lại): số câu hỏi, danh sách quiz, thời gian mỗi câu, thời gian tổng
- Lưu lịch sử trả lời: số đúng, số sai, ...

**Không cần anti-cheat** (mục đích tự luyện là chính)

**Admin / Editor có thể:** quản lý nội dung quiz

---

### 2.6. Người dùng (User)

- **Trang cá nhân:** hiển thị thành tích, hoạt động
- **Trang cài đặt:** điều chỉnh profile, thông tin đăng nhập

---

### 2.7. Thông báo (Notification)

- Admin tạo thông báo thủ công và emit tới tất cả người dùng
- Thông báo tự động khi người dùng hoàn thành điều kiện (ví dụ: hoàn thành course, challenge, quiz)

---

### 2.8. Thống kê (Statistics)

- Hiển thị **bảng xếp hạng** theo từng hạng mục cho người dùng theo dõi
- Admin có quyền xem thống kê chi tiết về người dùng

---

### 2.9. AI Assistant — ⚠️ DEFERRED

- Tính năng AI assistant (3 mode: learn / editor / learning_path) đã có scaffold trong `backend/ai/` nhưng **không nằm trong scope hiện tại**.
- Chi tiết spec: `docs/prd/09-ai-assistant.md`. Trạng thái: `docs/STATUS.md → Deferred Features`.
- Không triển khai khi chưa có phê duyệt rõ ràng từ team.

---

## 3. Yêu cầu phi chức năng

- **Database:** Tận dụng sức mạnh PostgreSQL
- **Logging:** Xây dựng log ở cả FE, BE, DB
- **Auth:** JWT + refresh token; cho phép truy cập từ nhiều thiết bị đồng thời
- **Error handling:** Bắt lỗi ở tất cả các lớp, reraise theo loại lỗi (DB lỗi → bắt lớp thấp; lỗi dịch vụ → ném về view); trả về message lỗi
- **Tích hợp linh động:** Khi đổi hostname của dịch vụ bên ngoài (ví dụ Outline) chỉ cần thay config, không cần sửa từng entry nội dung
- **Rate limiting:** Chống brute force

---

## 4. Công nghệ sử dụng

> Ưu tiên dùng giải pháp có sẵn, đã hoàn thiện — hạn chế code lại từ đầu.

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js |
| Backend | Django REST Framework |
| Database | PostgreSQL |

---

## 5. Bài toán mở (Open Problems)

### Chung

| # | Bài toán |
|---|----------|
| B1 | Sử dụng CDN để lưu static resource như thế nào? |
| B2 | Render client dựa vào cấu hình hệ thống và quyền người dùng |
| B3 | Sắp xếp nội dung |
| B4 | Resource-based, API-based hay Model-based authorization? *(đã chốt: API-based)* |

### Backend

*(Chưa có nội dung cụ thể)*

### Frontend

| # | Bài toán |
|---|----------|
| F1 | Đa ngôn ngữ cho trang web |
| F2 | Cho phép đổi theme |
| F3 | Giao diện kéo thả khi thiết kế nội dung |
| F4 | Ctrl+Z (undo/redo) trong editor |
