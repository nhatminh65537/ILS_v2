# Diagrams — ILS v2

Sơ đồ **ERD** và **kiến trúc hệ thống** cho nền tảng học an ninh mạng self-hosted
**ILS v2** (ba trụ cột: Learn / Challenge / Quiz).

Mỗi sơ đồ có 2 dạng file:
- `*.puml` — mã nguồn PlantUML (chỉnh sửa file này).
- `*.svg` — ảnh đã render (nhúng vào báo cáo Word/slide).

---

## Mục lục

| File | Nội dung |
|------|----------|
| [architecture.svg](architecture.svg) | **Sơ đồ kiến trúc hệ thống** — Frontend (Next.js) ↔ Backend (Django/DRF/Channels) ↔ PostgreSQL + tích hợp ngoài (Outline / GitLab / Deploy Server) |
| [erd-1-user-auth-rbac.svg](erd-1-user-auth-rbac.svg) | **ERD 1/3** — Người dùng · Xác thực · Phân quyền RBAC (user, profile, session, role, permission, các bảng join, permission cache) |
| [erd-2-learn-challenge.svg](erd-2-learn-challenge.svg) | **ERD 2/3** — Học tập (course/lesson/node + category/tag/progress/Outline) và Thử thách CTF (challenge/flag/file/instance/gitlab + category/tag/progress) |
| [erd-3-quiz-system.svg](erd-3-quiz-system.svg) | **ERD 3/3** — Quiz (quiz/question/option/answer/attempt/progress/config + category/tag) và các bảng cross-cutting (system_config, notification, audit_log) |

> ERD được tách 3 phần để mỗi hình vừa một trang khi trình bày trong báo cáo Word.

---

## Render lại sơ đồ

Yêu cầu: **Java** + `plantuml.jar` (dùng chung file trong `docs/usecase/`).

```powershell
# Cách 1 — chạy script
pwsh docs/diagrams/render.ps1

# Cách 2 — gọi trực tiếp
java -jar docs/usecase/plantuml.jar -tsvg docs/diagrams/*.puml
```

---

## Quy ước trong ERD

- Ký hiệu quan hệ dùng **crow's foot** (chân quạ): `||` = một-và-chỉ-một, `o{` = không-hoặc-nhiều.
- `<<PK>>` khóa chính · `<<FK>>` khóa ngoại · `<<UQ>>` ràng buộc unique · `<<join>>` bảng nối M:N.
- Tên bảng & cột bám đúng `db_table` / `db_column` trong `backend/api/models.py`.

## Nguồn dữ liệu

- `docs/DATA_MODEL.md` — nguồn authoritative cho thực thể/schema/business rule.
- `docs/ARCHITECTURE.md` — thiết kế hệ thống, luồng dữ liệu, tích hợp ngoài.
- `backend/api/models.py` — ORM thực tế (đối chiếu tên bảng/cột).
