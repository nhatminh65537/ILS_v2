# Use Case Diagrams — ILS v2

Bộ sơ đồ use case (UML) cho hệ thống **ILS v2** — nền tảng học an ninh mạng self-hosted
(ba trụ cột: **Learn** / **Challenge** / **Quiz**).

Mỗi sơ đồ có **2 dạng file**:
- `*.puml` — mã nguồn PlantUML (chỉnh sửa file này).
- `*.svg` — ảnh đã render (nhúng vào báo cáo/slide).

---

## Actor & quan hệ kế thừa (generalization)

```
Guest                       — chưa đăng nhập (chỉ đăng ký / đăng nhập / xem công khai)
  └─ Member                 — người dùng đã đăng nhập (học, làm thử thách, quiz, xem BXH)
       └─ Editor            — Member + quản lý nội dung (Learn / Challenge / Quiz)
            └─ Admin        — Editor + quản trị người dùng / RBAC / cấu hình hệ thống
```

Tên actor bám đúng RBAC thực tế trong code (`Guest / Member / Editor / Admin`).
Actor phụ **System** xuất hiện ở sơ đồ Thông báo (auto-trigger qua Django signal).

---

## Mục lục sơ đồ

| # | File | Nội dung |
|---|------|----------|
| — | [00-overview.svg](00-overview.svg) | **Tổng quan** — tóm lược tất cả nhóm use case của hệ thống |
| 1 | [01-auth.svg](01-auth.svg) | Xác thực & quản lý phiên (đăng ký, đăng nhập, SSO, reset, session) |
| 2 | [02-profile.svg](02-profile.svg) | Quản lý thông tin cá nhân |
| 3 | [03-learn-consume.svg](03-learn-consume.svg) | Học và luyện tập (người học) |
| 4 | [04-learn-manage.svg](04-learn-manage.svg) | Quản lý module học tập (course/folder/lesson/Outline) |
| 5 | [05-challenge-play.svg](05-challenge-play.svg) | Làm thử thách CTF (submit flag, instance) |
| 6 | [06-challenge-manage.svg](06-challenge-manage.svg) | Quản lý thử thách (flag/file/GitLab) |
| 7 | [07-quiz-play.svg](07-quiz-play.svg) | Luyện tập quiz qua WebSocket |
| 8 | [08-quiz-manage.svg](08-quiz-manage.svg) | Quản lý quiz & câu hỏi |
| 9 | [09-leaderboard-stats.svg](09-leaderboard-stats.svg) | Bảng xếp hạng & thống kê |
| 10 | [10-notifications.svg](10-notifications.svg) | Thông báo (broadcast + auto-trigger) |
| 11 | [11-rbac.svg](11-rbac.svg) | Quản lý vai trò & phân quyền (RBAC) |
| 12 | [12-user-management.svg](12-user-management.svg) | Quản lý người dùng |
| 13 | [13-system-config.svg](13-system-config.svg) | Cấu hình hệ thống & tích hợp |

---

## Render lại sơ đồ

Yêu cầu: **Java** (đã có sẵn) + `plantuml.jar` (đặt cùng thư mục này).

```powershell
# Cách 1 — chạy script (tự tải plantuml.jar nếu thiếu)
pwsh docs/usecase/render.ps1

# Cách 2 — gọi trực tiếp
java -jar docs/usecase/plantuml.jar -tsvg docs/usecase/*.puml
```

Phương án dự phòng bằng Docker (không cần Java cục bộ):

```powershell
docker run --rm -v ${PWD}:/data plantuml/plantuml -tsvg "/data/docs/usecase/*.puml"
```

> `plantuml.jar` (~29MB) không cần commit vào git — có thể thêm vào `.gitignore`.
> Script `render.ps1` sẽ tự tải lại khi thiếu.

---

## Quy ước trong sơ đồ

- **Khung chữ nhật có nhãn** = ranh giới hệ thống (system boundary).
- **`<<include>>`** = quan hệ bắt buộc / tiên quyết (ví dụ: thao tác cần *Đăng nhập*;
  *Submit flag* include *Kiểm tra flag* + *Ghi nhận lần nộp*).
- **`<<extend>>`** = mở rộng tùy chọn (ví dụ: *Tạo lesson* có thể mở rộng bằng *Import từ Outline*).
- Mỗi actor chỉ vẽ ở **mức quyền thấp nhất** có thao tác đó; actor cấp cao kế thừa qua generalization.

---

## Nguồn dữ liệu use case

Nội dung các sơ đồ được trích & đối chiếu từ tài liệu authoritative của dự án:

- `docs/REQUIREMENTS.md` — phạm vi & ràng buộc
- `docs/prd/*.md` — đặc tả chi tiết 10 tính năng
- `docs/ARCHITECTURE.md` — thiết kế, actor, luồng dữ liệu
- `docs/API.md` — inventory endpoint thực tế (Stable / Partial / Planned)
- `docs/STATUS.md` — trạng thái triển khai theo slice
