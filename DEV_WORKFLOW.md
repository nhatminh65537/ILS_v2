# DEV_WORKFLOW.md — Quy trình làm việc ILS v2

> Tài liệu này áp dụng cho **tất cả dev** (người và AI agent) khi làm việc trên ILS v2.
> Mỗi session = 1 subtask nhỏ, có plan, có commit cuối.

---

## 1. Xem tiến độ dự án

**Trước khi bắt đầu session**, kiểm tra 2 file này:

| File | Nội dung |
|------|----------|
| [`docs/STATUS.md`](docs/STATUS.md) | Trạng thái từng slice: done / in-progress / not started |
| [`docs/IMPL_PLAN.md`](docs/IMPL_PLAN.md) | Danh sách đầy đủ các Task theo từng Slice (0–11) |

> Subtask = một **Task** trong `docs/IMPL_PLAN.md` (ví dụ: Task 0.2, Task 1.1, ...)

---

## 2. Chọn subtask cho session

1. Mở [`docs/STATUS.md`](docs/STATUS.md) → tìm task chưa ai làm (không có tên dev nào)
2. Kiểm tra [`docs/DECISIONS.md`](docs/DECISIONS.md) → task đó có **OPEN questions** không?
   - Có OPEN question → **KHÔNG code**, báo team giải quyết trước
   - Tất cả RESOLVED → tiếp tục
3. **Claim task**: cập nhật `docs/STATUS.md`, thêm tên bạn vào cột "In Progress"

```
| Task 0.2 | Custom User model | In Progress — @your_name |
```

---

## 3. Plan trước khi code (bắt buộc)

Trước khi viết bất kỳ dòng code nào, viết plan ngắn vào chat (nếu dùng AI) hoặc vào comment của task:

```
## Plan — Task X.Y: <tên task>

Files sẽ chỉnh:
- backend/api/models.py  → thêm class User
- backend/backend/settings.py → cấu hình AUTH_USER_MODEL

Bước thực hiện:
1. ...
2. ...
3. ...

Test:
- python manage.py test api
```

> **KHÔNG code khi chưa có plan.** AI agent phải search memory trước khi plan.

---

## 4. Đọc tài liệu liên quan

Trước khi viết code, đọc nhanh:

- [`CLAUDE.md`](CLAUDE.md) — quick reference (stack, cách chạy project)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — nguyên tắc thiết kế, **những gì KHÔNG làm**
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — business rules, validation
- [`design/database/vx/dbv3.sql`](design/database/vx/dbv3.sql) — ⚠️ legacy schema reference; `docs/DATA_MODEL.md` là authoritative

---

## 5. Implement

- Làm **đúng 1 task** trong session, không làm thêm task khác
- Viết test khi cần thiết (unit test / integration test theo task)
- Chạy test trước khi commit:

```bash
cd backend
pytest                    # chạy toàn bộ test suite
# hoặc
pytest api/tests.py -v    # chạy test của app cụ thể
```

---

## 6. Cập nhật tài liệu

Sau khi code xong, cập nhật:

| File | Cập nhật gì |
|------|------------|
| [`docs/STATUS.md`](docs/STATUS.md) | Đánh dấu task là ✅ COMPLETED + ngày |
| [`docs/BUGS.md`](docs/BUGS.md) | Ghi lại nếu phát hiện bug mới |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Ghi lại quyết định kỹ thuật nếu có |

---

## 7. Cập nhật Memory (bắt buộc với AI agent, khuyến nghị với dev)

Sau khi code + tài liệu xong, đồng bộ lại project memory:

### a. Cập nhật `openmemory.md`

Nếu session tạo ra component mới, pattern mới, hoặc quyết định kỹ thuật mới — cập nhật `openmemory.md`:

| Thay đổi trong session | Cập nhật section trong `openmemory.md` |
|------------------------|----------------------------------------|
| Thêm model / app mới | `## Components` |
| Thêm service / pattern mới | `## Patterns` |
| Quyết định schema / thiết kế | `## Key DB Decisions` hoặc `## Architecture` |
| Thay đổi trạng thái dự án | `## Status` |

### b. Lưu vào OpenMemory MCP (AI agent)

AI agent **phải** gọi `add-memory` ít nhất 1 lần cuối session:

```
# Các loại memory nên lưu:
- Component mới tạo → memory_types: ["component"]
- Pattern / flow đáng nhớ → memory_types: ["implementation"]
- Bug đã fix → memory_types: ["debug"]
- Quyết định kỹ thuật → memory_types: ["project_info"]

# Format: project_id ONLY (không dùng user_preference cho facts)
```

> **Rule:** Nếu session tạo ≥ 3 file hoặc có flow phức tạp → bắt buộc lưu memory.
> AI agent: xem `CLAUDE.md` §"Session Completion — Memory Update" để biết đầy đủ.

---

## 8. Commit cuối session (bắt buộc)

Mỗi session kết thúc **phải có 1 commit**:

```bash
git add .
git commit -m "<slice>/<task>: <mô tả ngắn gọn>

- việc đã làm 1
- việc đã làm 2"
```

**Ví dụ:**
```
git commit -m "slice0/task0.2: add custom User model + initial migrations

- User model inherits AbstractBaseUser with JWT/SSO support
- AUTH_USER_MODEL set in settings.py
- Initial migration 0001 generated"
```

> Push lên branch riêng nếu chưa review: `git push origin feature/slice0-task0.2`

---

## Tóm tắt nhanh (checklist 1 session)

```
[ ] 1.  Đọc STATUS.md → chọn task chưa có người làm
[ ] 2.  Kiểm tra DECISIONS.md → không có OPEN question mới
[ ] 3.  Claim task trong STATUS.md (thêm tên + In Progress)
[ ] 4.  Viết plan (files + bước làm + test) — TRƯỚC khi code          [AI: search memory trước]
[ ] 5.  Đọc CLAUDE.md + ARCHITECTURE.md + DATA_MODEL.md liên quan
[ ] 6.  Implement đúng 1 task, viết test
[ ] 7.  Chạy test → xanh hết
[ ] 8.  Cập nhật STATUS.md (COMPLETED), BUGS.md nếu cần
[ ] 9.  Cập nhật openmemory.md nếu có component/pattern mới         [AI: add-memory qua MCP]
[ ] 10. git commit với message đúng format
[ ] 11. Push lên branch
[ ] 12. (AI agent) Tạo session report trong docs/reports/
```
