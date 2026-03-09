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

---

### 2.2. Authorization

**Thiết kế:**
- **API-based authorization** (không phải resource-based) — phù hợp với quy mô nhỏ, người dùng được truy cập mọi tài nguyên đã publish
- **Permission-based / Scope-based (fine-grained RBAC):**
  - Mỗi API hoặc nhóm API tương ứng một permission/scope
  - Role là tập hợp các permission
  - Permission có thể có cha; nếu cha bị disable thì con cũng bị disable
- **Token-based permission check (JWT claims):** encode permission vào token, kiểm tra tại server

**Cơ chế vận hành:**
- Permission được tạo tự động khi khởi động — scan toàn bộ endpoint bằng metaprogramming
- Permission không thể xóa dù là admin; khi xóa API và restart, permission đó bị đánh dấu `uncheck`
- Encode thứ bậc permission vào token (tốn nhẹ lúc revoke, nhanh lúc check)
- Cache encoded permission của user trong database (`user_permission_cache`); cập nhật khi admin thay đổi quyền
- Quyền trực tiếp của user ưu tiên hơn quyền từ role/group

**Admin có thể:**
- Gán quyền vào role, tạo role, gán user vào role
- Gán quyền trực tiếp cho user

**Các câu hỏi thiết kế (đã chốt):**

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Resource-based hay API-based? | API-based |
| Q2 | Tổ chức permission như thế nào? | Fine-grained RBAC (permission/scope per API) |
| Q3 | Cơ chế kiểm tra? | JWT claims (token-based) |
| Q4 | Đánh đổi thời gian revoke vs check? | Encode thứ bậc → hơi chậm khi revoke, nhanh khi check |
| Q5 *(optional)* | Update quyền realtime với JWT? | Chưa chốt |
| Q6 | Permission tạo khi nào? Có thể xóa không? | Runtime scan, không xóa được |
| Q7 *(optional)* | Cần cache check permission? | Không cần (quy mô nhỏ) |
| Q8 | Tăng tốc revoke token? | Cache encoded permission trong DB, update khi admin sửa |
| Q9 | Thứ tự ưu tiên quyền? | Quyền trực tiếp > quyền từ group |

---

### 2.3. Bài học (Learn)

**Tổ chức nội dung:**
- Course → nhiều folder (có thể lồng nhau) + lesson
- Folder và lesson có thứ tự và tên
- Course có: category, tag, learning point (lpoint), filter theo các trường, tìm kiếm theo tên

**Loại bài học (lesson):**
- Văn bản (Markdown)
- Video (có thể embed qua Markdown)
- Mini-quiz (nhúng vào trang)

**Tạo nội dung:**
- Tạo thủ công qua editor
- Hoặc chọn từ [Outline](https://github.com/outline/outline) — dùng làm nơi edit và lưu trữ tài nguyên

**Progress:**
- Đánh dấu hoàn thành khi người dùng nhấn "complete" (trigger sau khi scroll đến cuối trang)
- Lưu trạng thái user + course và danh sách lesson hoàn thành (user + lesson): trạng thái, thời gian bắt đầu, thời gian kết thúc

**Admin có thể:**
- Cấu hình độ sâu tối đa của cây bài học
- Cấu hình cách upload tài liệu
- Cấu hình tài khoản Outline

**Không làm:** comment, note, rating

**Các câu hỏi thiết kế (đã chốt):**

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Bài học được load như thế nào? | Load cây lazy (mở rộng theo yêu cầu), cache content bài đang học trong context |
| Q2 | Giải quyết N+1 query trong load cây? | Materialized Path — node có `pre_path`, mọi thao tác qua node |

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
- Cần hệ thống riêng để tạo và quản lý instance
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
| Q1 | Cơ chế instance? | Mỗi user một instance riêng; quản lý qua hệ thống deploy ngoài |
| Q2 | Import GitLab như thế nào? | Sync metadata + README; nút sync thủ công khi update |

---

### 2.5. Luyện tập (Quiz)

**Tổ chức nội dung:**
- Cấu trúc folder + quiz (tương tự challenge)
- Quiz có: category, tag, quiz point; filter

**Loại câu hỏi:**
- Single choice
- Multi choice — chỉ tính điểm khi chọn đúng tất cả đáp án
- Fill in the blank
- Case-sensitive cấu hình được trên từng câu hỏi

**Trải nghiệm làm bài:**
- Thực hành theo kiểu: answer → check → next (sử dụng **WebSocket**)
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
