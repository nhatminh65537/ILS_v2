# Integration Test Checklist — Slice 7: Quiz (Full Stack)

> **Môi trường:** Frontend + Backend thật (không dùng MSW). MSW phải được tắt.
> **Backend:** Django/Daphne @ `http://localhost:8000`, WebSocket @ `ws://localhost:8000`
> **Frontend:** Next.js @ `http://localhost:4000` với `NEXT_PUBLIC_USE_MSW=false`
> **Ngày tạo:** 2026-04-14
> **Tham chiếu:** `docs/prd/07-quiz.md`, `docs/API.md`, `docs/DATA_MODEL.md`

---

## Mục lục

1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Dữ liệu kiểm thử chuẩn](#2-dữ-liệu-kiểm-thử-chuẩn)
3. [PHẦN I — Xác thực & Phân quyền API](#phần-i--xác-thực--phân-quyền-api)
4. [PHẦN II — Quiz CRUD (HTTP API)](#phần-ii--quiz-crud-http-api)
5. [PHẦN III — Question CRUD (HTTP API)](#phần-iii--question-crud-http-api)
6. [PHẦN IV — Quiz Config & Progress (HTTP API)](#phần-iv--quiz-config--progress-http-api)
7. [PHẦN V — QuizNode Tree API](#phần-v--quiznode-tree-api)
8. [PHẦN VI — WebSocket Session (Protocol)](#phần-vi--websocket-session-protocol)
9. [PHẦN VII — Scoring Engine](#phần-vii--scoring-engine)
10. [PHẦN VIII — Progress Tracking & Signals](#phần-viii--progress-tracking--signals)
11. [PHẦN IX — Frontend Integration (User Surface)](#phần-ix--frontend-integration-user-surface)
12. [PHẦN X — Frontend Integration (Admin Surface)](#phần-x--frontend-integration-admin-surface)
13. [PHẦN XI — Cross-feature & End-to-End Flows](#phần-xi--cross-feature--end-to-end-flows)
14. [PHẦN XII — Edge Cases & Security](#phần-xii--edge-cases--security)

---

## 1. Chuẩn bị môi trường

### 1.1 Khởi động server

```bash
# Terminal 1 — Backend (WebSocket support bắt buộc dùng Daphne, KHÔNG dùng runserver thuần)
cd backend
source ../.venv/bin/activate        # Unix
# ..\\.venv\\Scripts\\activate       # Windows
daphne -p 8000 backend.asgi:application

# Terminal 2 — Frontend (tắt MSW)
cd frontend
NEXT_PUBLIC_USE_MSW=false npm run dev
# Hoặc set trong .env.local: NEXT_PUBLIC_USE_MSW=false
```

> **Tại sao cần Daphne?** `python manage.py runserver` không hỗ trợ ASGI/WebSocket — consumer sẽ không hoạt động.

### 1.2 Kiểm tra MSW đã tắt

| Thao tác | Mục đích | Kết quả mong đợi |
|----------|---------|-----------------|
| Mở DevTools → Network | Xác nhận requests không bị MSW intercept | Requests đến `localhost:8000` (không phải Service Worker) |
| Console không có `[MSW]` | Xác nhận MSW inactive | Không có log MSW |

---

## 2. Dữ liệu kiểm thử chuẩn

> **Mục đích:** Đảm bảo database ở trạng thái xác định trước mỗi lần test. Chạy script dưới đây để reset và seed dữ liệu.

### 2.1 Reset & Seed database

```bash
# Từ thư mục backend/
python manage.py flush --no-input          # Xóa toàn bộ dữ liệu (giữ schema)
python manage.py migrate                   # Đảm bảo schema mới nhất
python manage.py seed_config               # Seed system_config defaults
python manage.py seed_roles                # Tạo roles: Admin, Editor, Member
python manage.py shell -c "
from django.contrib.auth import get_user_model
from api.models import *

User = get_user_model()

# --- Users ---
admin = User.objects.create_superuser('admin', 'admin@test.local', 'admin1234')
editor = User.objects.create_user('editor1', 'editor@test.local', 'editor1234')
member1 = User.objects.create_user('member1', 'member1@test.local', 'member1234')
member2 = User.objects.create_user('member2', 'member2@test.local', 'member1234')

# --- Assign roles ---
from api.models import Role, UserRole
role_admin = Role.objects.get(name='Admin')
role_editor = Role.objects.get(name='Editor')
role_member = Role.objects.get(name='Member')
UserRole.objects.create(user=admin, role=role_admin)
UserRole.objects.create(user=editor, role=role_editor)
UserRole.objects.create(user=member1, role=role_member)
UserRole.objects.create(user=member2, role=role_member)

# --- Quiz Categories ---
cat_web = QuizCategory.objects.create(name='Web Security')
cat_crypto = QuizCategory.objects.create(name='Cryptography')
cat_network = QuizCategory.objects.create(name='Networking')

# --- Quiz Tags ---
tag_owasp = QuizTag.objects.create(name='owasp')
tag_beginner = QuizTag.objects.create(name='beginner')
tag_crypto = QuizTag.objects.create(name='crypto')

# --- Quizzes ---
quiz1 = Quiz.objects.create(
    title='OWASP Basics Quiz',
    description='Test your OWASP Top 10 knowledge.',
    status='published',
    category=cat_web,
    quiz_point=100,
    time_limit_sec=900,
    total_questions=0,
)
QuizTagMap.objects.create(quiz=quiz1, tag=tag_owasp)
QuizTagMap.objects.create(quiz=quiz1, tag=tag_beginner)

quiz2 = Quiz.objects.create(
    title='Crypto Warmup',
    description='Basic cryptography concepts.',
    status='published',
    category=cat_crypto,
    quiz_point=60,
    time_limit_sec=600,
    total_questions=0,
)
QuizTagMap.objects.create(quiz=quiz2, tag=tag_crypto)

quiz3 = Quiz.objects.create(
    title='Networking Essentials',
    description='Core networking quiz.',
    status='published',
    category=cat_network,
    quiz_point=80,
    time_limit_sec=1200,
    total_questions=0,
)

quiz4 = Quiz.objects.create(
    title='Advanced Forensics',
    description='Draft quiz not published.',
    status='draft',
    category=cat_web,
    quiz_point=120,
    time_limit_sec=1800,
    total_questions=0,
)

quiz5 = Quiz.objects.create(
    title='Empty Quiz',
    description='Quiz with no questions.',
    status='published',
    category=cat_web,
    quiz_point=50,
    time_limit_sec=300,
    total_questions=0,
)

# --- Questions for Quiz 1 (OWASP Basics) ---
q1 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='single_choice',
    content={'text': 'Which vulnerability belongs to OWASP Top 10 2021?'},
    explanation='Broken Access Control ranked #1 in OWASP Top 10 2021.',
    case_sensitive=False,
    score=10,
    position=1,
    status='published',
)
QuizQuestionOption.objects.create(question=q1, content='Broken Access Control', is_correct=True, position=1)
QuizQuestionOption.objects.create(question=q1, content='Buffer Overflow in Kernel', is_correct=False, position=2)
QuizQuestionOption.objects.create(question=q1, content='DNS Cache Poisoning', is_correct=False, position=3)

q2 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='multi_choice',
    content={'text': 'Select ALL secure coding practices from the list below.'},
    explanation='',
    case_sensitive=False,
    score=20,
    position=2,
    status='published',
)
QuizQuestionOption.objects.create(question=q2, content='Input validation', is_correct=True, position=1)
QuizQuestionOption.objects.create(question=q2, content='Parameterized queries', is_correct=True, position=2)
QuizQuestionOption.objects.create(question=q2, content='Disable all logging in production', is_correct=False, position=3)
QuizQuestionOption.objects.create(question=q2, content='Use eval() for dynamic code', is_correct=False, position=4)

q3 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='fill_blank',
    content={'text': 'The process of verifying a user\'s identity is called ______.'},
    explanation='Authentication is the process of verifying identity.',
    case_sensitive=False,
    score=10,
    position=3,
    status='published',
)
QuizQuestionAnswer.objects.create(question=q3, answer='authentication')
QuizQuestionAnswer.objects.create(question=q3, answer='authn')

# --- Questions for Quiz 2 (Crypto Warmup) ---
q4 = QuizQuestion.objects.create(
    quiz=quiz2,
    question_type='single_choice',
    content={'text': 'SHA-256 produces a hash of how many bits?'},
    explanation='SHA-256 produces a 256-bit (32-byte) hash digest.',
    case_sensitive=False,
    score=10,
    position=1,
    status='published',
)
QuizQuestionOption.objects.create(question=q4, content='128 bits', is_correct=False, position=1)
QuizQuestionOption.objects.create(question=q4, content='256 bits', is_correct=True, position=2)
QuizQuestionOption.objects.create(question=q4, content='512 bits', is_correct=False, position=3)

q5 = QuizQuestion.objects.create(
    quiz=quiz2,
    question_type='fill_blank',
    content={'text': 'RSA is an example of ______ key cryptography.'},
    explanation='RSA uses asymmetric (public-key) cryptography.',
    case_sensitive=False,
    score=10,
    position=2,
    status='published',
)
QuizQuestionAnswer.objects.create(question=q5, answer='asymmetric')
QuizQuestionAnswer.objects.create(question=q5, answer='public-key')
QuizQuestionAnswer.objects.create(question=q5, answer='public key')

# Sync total_questions
for q in [quiz1, quiz2, quiz3, quiz4, quiz5]:
    q.total_questions = q.questions.count()
    q.save(update_fields=['total_questions'])

print('Seed hoàn tất.')
print(f'Quiz1: {quiz1.total_questions} câu, Quiz2: {quiz2.total_questions} câu')
print(f'Users: admin, editor1, member1, member2')
"
```

### 2.2 Bảng tóm tắt dữ liệu seed

**Users:**

| Username | Password | Role | Ghi chú |
|----------|----------|------|---------|
| `admin` | `admin1234` | Admin (superuser) | Toàn quyền |
| `editor1` | `editor1234` | Editor | Quản lý nội dung |
| `member1` | `member1234` | Member | Người học, dùng để test quiz session |
| `member2` | `member1234` | Member | Dùng để test isolation giữa các user |

**Quizzes:**

| ID | Title | Status | Questions | Points | Time |
|----|-------|--------|-----------|--------|------|
| 1 | OWASP Basics Quiz | published | 3 | 100 | 900s |
| 2 | Crypto Warmup | published | 2 | 60 | 600s |
| 3 | Networking Essentials | published | 0 | 80 | 1200s |
| 4 | Advanced Forensics | **draft** | 0 | 120 | 1800s |
| 5 | Empty Quiz | published | 0 | 50 | 300s |

**Câu hỏi:**

| ID | Quiz | Loại | Score | Đáp án đúng |
|----|------|------|-------|-------------|
| Q1 | Quiz 1 | single_choice | 10 | "Broken Access Control" |
| Q2 | Quiz 1 | multi_choice | 20 | "Input validation" + "Parameterized queries" |
| Q3 | Quiz 1 | fill_blank | 10 | "authentication" hoặc "authn" (case-insensitive) |
| Q4 | Quiz 2 | single_choice | 10 | "256 bits" |
| Q5 | Quiz 2 | fill_blank | 10 | "asymmetric" / "public-key" / "public key" |

### 2.3 Lấy JWT tokens để test API trực tiếp

```bash
# Lấy token cho member1
curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"member1","password":"member1234"}' | python -m json.tool

# Lưu access token vào biến (Unix)
MEMBER1_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"member1","password":"member1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])")

EDITOR_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"editor1","password":"editor1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])")

ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])")
```

---

## PHẦN I — Xác thực & Phân quyền API

> **Mục đích:** Đảm bảo RBAC enforcement đúng — Member không tạo/sửa được, Editor/Admin có thể.

### I-1 · Unauthenticated requests

| # | Lệnh / Thao tác | Kết quả mong đợi | Ghi chú |
|---|----------------|-----------------|---------|
| I-1.1 | `GET /api/quiz/quizzes/` không có Authorization header | `401 Unauthorized` | Mọi quiz endpoint đều cần auth |
| I-1.2 | `POST /api/quiz/quizzes/` không có token | `401 Unauthorized` | |
| I-1.3 | `GET /api/quiz/nodes/` không có token | `401 Unauthorized` | |

### I-2 · Member — chỉ đọc, không tạo/sửa

| # | Lệnh (với `$MEMBER1_TOKEN`) | Kết quả mong đợi |
|---|---------------------------|-----------------|
| I-2.1 | `GET /api/quiz/quizzes/` | `200 OK` — chỉ trả published quizzes |
| I-2.2 | `POST /api/quiz/quizzes/` với body hợp lệ | `403 Forbidden` |
| I-2.3 | `PATCH /api/quiz/quizzes/1/` với `{"title":"hack"}` | `403 Forbidden` |
| I-2.4 | `DELETE /api/quiz/quizzes/1/` | `403 Forbidden` |
| I-2.5 | `GET /api/quiz/quizzes/1/questions/` | `403 Forbidden` (Editor-only endpoint) |
| I-2.6 | `POST /api/quiz/quizzes/1/questions/` | `403 Forbidden` |
| I-2.7 | `GET /api/quiz/quizzes/1/config/` | `200 OK` (config là Member+ endpoint) |
| I-2.8 | `GET /api/quiz/quizzes/1/progress/` | `200 OK` |

### I-3 · Member không thấy draft quiz

| # | Lệnh (với `$MEMBER1_TOKEN`) | Kết quả mong đợi |
|---|---------------------------|-----------------|
| I-3.1 | `GET /api/quiz/quizzes/` | Response không chứa Quiz 4 (draft) |
| I-3.2 | `GET /api/quiz/quizzes/4/` | `404 Not Found` (quiz draft không visible với Member) |
| I-3.3 | `GET /api/quiz/quizzes/?status=draft` | Trả về empty hoặc 403 — Member không lọc được draft |

### I-4 · Editor — có quyền CRUD

| # | Lệnh (với `$EDITOR_TOKEN`) | Kết quả mong đợi |
|---|--------------------------|-----------------|
| I-4.1 | `GET /api/quiz/quizzes/` | `200 OK` — có thể thấy tất cả status |
| I-4.2 | `GET /api/quiz/quizzes/?status=draft` | Trả về Quiz 4 (draft) |
| I-4.3 | `POST /api/quiz/quizzes/` với body hợp lệ | `201 Created` |
| I-4.4 | `PATCH /api/quiz/quizzes/1/` | `200 OK` |
| I-4.5 | `DELETE /api/quiz/quizzes/5/` | `204 No Content` |
| I-4.6 | `GET /api/quiz/quizzes/1/questions/` | `200 OK` |
| I-4.7 | `POST /api/quiz/quizzes/1/questions/` với body hợp lệ | `201 Created` |

---

## PHẦN II — Quiz CRUD (HTTP API)

> **Tool đề xuất:** curl, httpie, hoặc Postman. Chạy sau khi seed database.

### II-1 · GET list (Member)

```bash
curl -H "Authorization: Bearer $MEMBER1_TOKEN" http://localhost:8000/api/quiz/quizzes/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-1.1 | HTTP status | `200 OK` |
| II-1.2 | Số lượng items | 3 items (Quiz 1, 2, 3 — tất cả published; Quiz 4 draft bị ẩn; Quiz 5 published nhưng 0 câu hỏi vẫn hiện) |
| II-1.3 | Cấu trúc mỗi item | Có fields: `id`, `title`, `description`, `status`, `quiz_point`, `total_questions`, `time_limit_sec`, `updated_at` |
| II-1.4 | Quiz 4 không xuất hiện | Mảng không có object với `id=4` (draft) |
| II-1.5 | total_questions Quiz 1 | = `3` (khớp với seed) |

### II-2 · GET list với status filter (Editor)

```bash
curl -H "Authorization: Bearer $EDITOR_TOKEN" \
  "http://localhost:8000/api/quiz/quizzes/?status=draft"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-2.1 | HTTP status | `200 OK` |
| II-2.2 | Kết quả | Chỉ Quiz 4 (draft) — không lẫn published |
| II-2.3 | `status=published` | Chỉ trả published quizzes (Quiz 1, 2, 3, 5) |
| II-2.4 | `status=archived` | Empty list (chưa có archived) |

### II-3 · GET detail (retrieve)

```bash
curl -H "Authorization: Bearer $MEMBER1_TOKEN" http://localhost:8000/api/quiz/quizzes/1/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-3.1 | HTTP status | `200 OK` |
| II-3.2 | Fields đầy đủ | Ngoài list fields còn có: `category`, `tags` array |
| II-3.3 | Category | Object với `id` và `name` = "Web Security" |
| II-3.4 | Tags | Array chứa "owasp" và "beginner" |
| II-3.5 | `GET /api/quiz/quizzes/9999/` | `404 Not Found` |

### II-4 · POST create (Editor)

```bash
curl -s -X POST http://localhost:8000/api/quiz/quizzes/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Integration Test Quiz",
    "description": "Created during integration test",
    "status": "draft",
    "quiz_point": 50,
    "time_limit_sec": 600
  }'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-4.1 | HTTP status | `201 Created` |
| II-4.2 | Response body | Có `id` mới (auto-increment), `title` đúng như input |
| II-4.3 | `total_questions` | = `0` (chưa có câu hỏi) |
| II-4.4 | `status` | = `"draft"` |
| II-4.5 | Tạo với title rỗng `""` | `400 Bad Request` với validation error |
| II-4.6 | Tạo với `quiz_point=-1` | `400 Bad Request` (quiz_point phải >= 0) |

### II-5 · PATCH update (Editor)

```bash
# Giả sử quiz mới vừa tạo có id=6
curl -s -X PATCH http://localhost:8000/api/quiz/quizzes/6/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Quiz Title", "status": "published"}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-5.1 | HTTP status | `200 OK` |
| II-5.2 | `title` trong response | = `"Updated Quiz Title"` |
| II-5.3 | `status` trong response | = `"published"` |
| II-5.4 | Các field không gửi | Không thay đổi (partial update) |

### II-6 · DELETE (Editor)

```bash
curl -s -X DELETE http://localhost:8000/api/quiz/quizzes/6/ \
  -H "Authorization: Bearer $EDITOR_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-6.1 | HTTP status | `204 No Content` |
| II-6.2 | GET sau khi xóa | `404 Not Found` |
| II-6.3 | Xóa quiz có questions | Quiz bị xóa, questions cascade-deleted (kiểm tra DB) |
| II-6.4 | DELETE quiz id không tồn tại | `404 Not Found` |

---

## PHẦN III — Question CRUD (HTTP API)

### III-1 · GET questions của một quiz (Editor)

```bash
curl -H "Authorization: Bearer $EDITOR_TOKEN" \
  http://localhost:8000/api/quiz/quizzes/1/questions/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-1.1 | HTTP status | `200 OK` |
| III-1.2 | Số items | 3 câu hỏi (Q1, Q2, Q3 thuộc Quiz 1) |
| III-1.3 | Thứ tự | Sorted by `position` (Q1 pos=1, Q2 pos=2, Q3 pos=3) |
| III-1.4 | Q1 structure | `question_type=single_choice`, `score=10`, `options` array có 3 items, `is_correct` có đúng 1 cái True |
| III-1.5 | Q2 structure | `question_type=multi_choice`, `options` array, `is_correct` có 2 cái True |
| III-1.6 | Q3 structure | `question_type=fill_blank`, `answers` array có 2 items, không có `options` |
| III-1.7 | Quiz không có questions (Quiz 3) | `[]` empty array |
| III-1.8 | Member access | `403 Forbidden` |

### III-2 · POST create question — single_choice (Editor)

```bash
curl -s -X POST http://localhost:8000/api/quiz/quizzes/1/questions/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_type": "single_choice",
    "content": {"text": "What does XSS stand for?"},
    "explanation": "Cross-Site Scripting.",
    "case_sensitive": false,
    "score": 10,
    "position": 4,
    "options": [
      {"content": "Cross-Site Scripting", "is_correct": true, "position": 1},
      {"content": "Cross-System Security", "is_correct": false, "position": 2}
    ]
  }'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-2.1 | HTTP status | `201 Created` |
| III-2.2 | Response có `id` mới | ✓ |
| III-2.3 | `options` trong response | 2 options, is_correct đúng như input |
| III-2.4 | total_questions của Quiz 1 | Tăng từ 3 lên 4 — kiểm tra `GET /api/quiz/quizzes/1/` |

### III-3 · POST create question — validation failures

| # | Payload | Kết quả mong đợi |
|---|---------|-----------------|
| III-3.1 | `question_type=single_choice`, thiếu `options` | `400` — options bắt buộc cho single/multi_choice |
| III-3.2 | `single_choice` với 2 options đều `is_correct=true` | `400` — single_choice phải có đúng 1 correct |
| III-3.3 | `single_choice` với 0 options `is_correct=true` | `400` |
| III-3.4 | `multi_choice` với 0 options `is_correct=true` | `400` — cần ít nhất 1 correct |
| III-3.5 | `fill_blank` thiếu `answers` | `400` — answers bắt buộc cho fill_blank |
| III-3.6 | `fill_blank` với `answers=[]` | `400` — cần ít nhất 1 answer |
| III-3.7 | `score=0` | `400` — score phải > 0 |
| III-3.8 | Thiếu `content` | `400` |

### III-4 · PUT update question (Editor)

```bash
# Update Q1 (id=1, thuộc quiz 1)
curl -s -X PUT http://localhost:8000/api/quiz/quizzes/1/questions/1/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_type": "single_choice",
    "content": {"text": "Which is #1 in OWASP Top 10 2021?"},
    "explanation": "Updated explanation.",
    "case_sensitive": false,
    "score": 15,
    "position": 1,
    "options": [
      {"content": "Broken Access Control", "is_correct": true, "position": 1},
      {"content": "Cryptographic Failures", "is_correct": false, "position": 2}
    ]
  }'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-4.1 | HTTP status | `200 OK` |
| III-4.2 | `score` cập nhật | = `15` |
| III-4.3 | Options mới | 2 options mới thay thế options cũ |
| III-4.4 | PUT question thuộc quiz khác | `404 Not Found` (quiz/question mismatch) |

### III-5 · DELETE question (Editor)

```bash
curl -s -X DELETE http://localhost:8000/api/quiz/quizzes/1/questions/3/ \
  -H "Authorization: Bearer $EDITOR_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-5.1 | HTTP status | `204 No Content` |
| III-5.2 | total_questions Quiz 1 | Giảm đúng 1 — signal hoặc sync_total chạy |
| III-5.3 | GET questions sau khi xóa | Q3 không còn trong list |
| III-5.4 | Options/answers của Q3 | Đã bị cascade-deleted |

---

## PHẦN IV — Quiz Config & Progress (HTTP API)

### IV-1 · GET config (lần đầu — auto-create)

```bash
curl -H "Authorization: Bearer $MEMBER1_TOKEN" \
  http://localhost:8000/api/quiz/quizzes/1/config/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-1.1 | HTTP status | `200 OK` |
| IV-1.2 | Config được tạo tự động | `id` có giá trị (không null) |
| IV-1.3 | Default values | `total_questions=null`, `time_limit_sec=null`, `random_question=false`, `random_option=false`, `allow_review=true`, `allow_retry=true`, `max_attempt=null` |
| IV-1.4 | `quiz_id` | = `1` |
| IV-1.5 | `user_id` | = id của member1 |
| IV-1.6 | GET lần 2 | Trả cùng object (không tạo duplicate) |

### IV-2 · PUT config — cập nhật tùy chọn

```bash
curl -s -X PUT http://localhost:8000/api/quiz/quizzes/1/config/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "total_questions": 2,
    "time_limit_sec": 120,
    "random_question": true,
    "random_option": false,
    "allow_review": false,
    "allow_retry": true,
    "max_attempt": 5
  }'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-2.1 | HTTP status | `200 OK` |
| IV-2.2 | `max_attempt` | = `5` |
| IV-2.3 | `random_question` | = `true` |
| IV-2.4 | Config của member2 cho Quiz 1 | Là config độc lập — không bị ảnh hưởng bởi member1's config |

### IV-3 · GET progress (chưa có attempt)

```bash
curl -H "Authorization: Bearer $MEMBER1_TOKEN" \
  http://localhost:8000/api/quiz/quizzes/2/progress/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-3.1 | HTTP status | `200 OK` |
| IV-3.2 | `attempt_count` | = `0` |
| IV-3.3 | `best_score` | = `0` |
| IV-3.4 | `first_attempted_at` | = `null` |
| IV-3.5 | Response structure | Vẫn trả object hợp lệ (không 404) |

---

## PHẦN V — QuizNode Tree API

### V-1 · CRUD cơ bản

```bash
# Tạo root node
curl -s -X POST http://localhost:8000/api/quiz/nodes/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Security Fundamentals", "is_item": false, "position": 1}'
```

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| V-1.1 | POST root node | `201 Created`, `parent=null`, `path` được assign |
| V-1.2 | POST child node với `parent_id` hợp lệ | `201 Created`, `path` = `{parent_path}.{id}` format |
| V-1.3 | POST leaf node với `quiz_id` | `201 Created`, liên kết đến quiz |
| V-1.4 | GET `/api/quiz/nodes/` | Chỉ trả root nodes (parent=null) |
| V-1.5 | GET `/api/quiz/nodes/{id}/children/` | Trả children của node đó |
| V-1.6 | Member GET | `200 OK` (read-only) |
| V-1.7 | Member POST | `403 Forbidden` |

### V-2 · Move node

```bash
# Tạo 2 root nodes, sau đó di chuyển node 2 thành child của node 1
curl -s -X POST http://localhost:8000/api/quiz/nodes/{node2_id}/move/ \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parent_id": {node1_id}}'
```

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| V-2.1 | Move node thành child | `200 OK`, `parent_id` cập nhật |
| V-2.2 | Move node về root | POST với `parent_id=null` → `parent=null` |
| V-2.3 | Cycle detection: move node thành child của chính nó | `400 Bad Request` với error message |
| V-2.4 | Move không tồn tại | `404 Not Found` |

---

## PHẦN VI — WebSocket Session (Protocol)

> **Tool:** wscat (`npm install -g wscat`) hoặc trực tiếp qua trình duyệt.
> **Lưu ý:** Mỗi test case WS nên dùng tab mới hoặc kết nối mới để tránh state lẫn.

### VI-1 · Auth flow

```bash
wscat -c ws://localhost:8000/ws/quiz/1/
```

Sau khi kết nối, gửi:
```json
{"type": "auth", "token": "<MEMBER1_ACCESS_TOKEN>"}
```

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| VI-1.1 | Kết nối WS | Connection established (không bị từ chối ngay) |
| VI-1.2 | Gửi auth message với token hợp lệ | Server phản hồi `{"type": "auth_ok", "user_id": ..., "username": "member1"}` |
| VI-1.3 | Gửi auth message với token sai | Server đóng kết nối với close code `4001` (AUTH_FAILED) |
| VI-1.4 | Không gửi auth sau 5 giây | Server đóng kết nối với close code `4008` (AUTH_TIMEOUT) |
| VI-1.5 | Kết nối với quiz_id không tồn tại | Server đóng với `4004` (QUIZ_NOT_FOUND) |
| VI-1.6 | Token hết hạn | Đóng với `4001` |

### VI-2 · Start session

Sau auth thành công, gửi:
```json
{"action": "start"}
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-2.1 | Server gửi câu hỏi đầu tiên | `{"type": "question", "attempt_id": ..., "question": {...}, "progress": {"current": 1, "total": 3}}` |
| VI-2.2 | `question.question_type` | = `"single_choice"` (Q1) |
| VI-2.3 | `question.content` | Object có `text` field |
| VI-2.4 | `question.options` | Array với các options (không có `is_correct` — không lộ đáp án) |
| VI-2.5 | `attempt_id` được tạo | Có giá trị integer, kiểm tra trong DB `UserQuizAttempt` |
| VI-2.6 | `progress.total` | = `3` (tổng số câu hỏi của Quiz 1) |
| VI-2.7 | Start quiz có 0 câu hỏi (Quiz 3 hoặc 5) | Server gửi `{"type": "finish", ...}` ngay |

### VI-3 · Answer single_choice — đúng

```json
{"action": "answer", "question_id": <Q1_ID>, "answer": {"option_ids": [<CORRECT_OPTION_ID>]}}
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-3.1 | Server phản hồi | `{"type": "answer_result", "is_correct": true, "score_obtained": 10, "explanation": "...", "correct_answer": {...}}` |
| VI-3.2 | `is_correct` | = `true` |
| VI-3.3 | `score_obtained` | = `10` (score của Q1) |
| VI-3.4 | `explanation` | Text explanation của Q1 |
| VI-3.5 | `correct_answer` trả về | Object chứa các option_ids đúng |

### VI-4 · Answer single_choice — sai

```json
{"action": "answer", "question_id": <Q1_ID>, "answer": {"option_ids": [<WRONG_OPTION_ID>]}}
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-4.1 | `is_correct` | = `false` |
| VI-4.2 | `score_obtained` | = `0` |
| VI-4.3 | `explanation` | Vẫn hiển thị (member được xem explanation dù sai) |
| VI-4.4 | `correct_answer` | Chứa option đúng (để member biết đáp án) |

### VI-5 · Answer multi_choice

Scenario A — thiếu 1 đáp án đúng:
```json
{"action": "answer", "question_id": <Q2_ID>, "answer": {"option_ids": [<INPUT_VALIDATION_ID>]}}
```

Scenario B — chọn đủ 2 đúng:
```json
{"action": "answer", "question_id": <Q2_ID>, "answer": {"option_ids": [<INPUT_VALIDATION_ID>, <PARAM_QUERIES_ID>]}}
```

Scenario C — chọn thêm 1 sai:
```json
{"action": "answer", "question_id": <Q2_ID>, "answer": {"option_ids": [<INPUT_VALIDATION_ID>, <PARAM_QUERIES_ID>, <DISABLE_LOG_ID>]}}
```

| # | Scenario | Kết quả mong đợi |
|---|---------|-----------------|
| VI-5.1 | Scenario A (thiếu 1) | `is_correct=false`, `score_obtained=0` |
| VI-5.2 | Scenario B (đủ cả 2) | `is_correct=true`, `score_obtained=20` |
| VI-5.3 | Scenario C (dư 1 sai) | `is_correct=false`, `score_obtained=0` |

### VI-6 · Answer fill_blank

Scenario A — đúng (case-insensitive):
```json
{"action": "answer", "question_id": <Q3_ID>, "answer": {"text": "Authentication"}}
```

Scenario B — đúng (alias):
```json
{"action": "answer", "question_id": <Q3_ID>, "answer": {"text": "authn"}}
```

Scenario C — sai hoàn toàn:
```json
{"action": "answer", "question_id": <Q3_ID>, "answer": {"text": "login"}}
```

| # | Scenario | Kết quả mong đợi |
|---|---------|-----------------|
| VI-6.1 | "Authentication" (capital A) | `is_correct=true` (case_sensitive=false) |
| VI-6.2 | "authn" | `is_correct=true` (accepted alias) |
| VI-6.3 | "login" | `is_correct=false` |
| VI-6.4 | "" (empty string) | Server reject hoặc `is_correct=false` |

### VI-7 · Next action & finish

```json
{"action": "next"}
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-7.1 | Sau câu 1, gửi "next" | Server gửi `{"type": "question", ...}` với câu 2 |
| VI-7.2 | `progress.current` tăng | = `2` |
| VI-7.3 | Sau câu cuối, gửi "next" | Server gửi `{"type": "finish", "attempt_id": ..., "total_score": ..., "max_score": ..., "duration_sec": ...}` |
| VI-7.4 | `max_score` | = `40` (Q1=10 + Q2=20 + Q3=10) |
| VI-7.5 | `total_score` | Phụ thuộc vào đáp án đã trả lời (0–40) |
| VI-7.6 | `duration_sec` | Số giây từ start đến finish (giá trị dương) |
| VI-7.7 | UserQuizAttempt trong DB | `finished_at` được set, `total_score` đúng |

### VI-8 · max_attempt enforcement

```bash
# Set max_attempt=1 cho member1 với Quiz 1
curl -s -X PUT http://localhost:8000/api/quiz/quizzes/1/config/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_attempt": 1, "allow_retry": true}'
```

Sau đó hoàn thành 1 session (finish). Sau đó kết nối WS mới và gửi `{"action": "start"}`:

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-8.1 | Attempt lần 2 sau khi hết max | Server đóng WS với close code `4003` (MAX_ATTEMPT_EXCEEDED) |

---

## PHẦN VII — Scoring Engine

> Các test này dùng curl để kiểm tra kết quả qua `UserQuizAttempt` trong DB.

### VII-1 · Perfect score (tất cả đúng)

1. Kết nối WS với Quiz 1
2. Auth + Start
3. Answer Q1 đúng, Next
4. Answer Q2 đúng (cả 2 options), Next
5. Answer Q3 đúng ("authentication"), Next
6. Nhận finish event

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VII-1.1 | `total_score` trong finish event | = `40` |
| VII-1.2 | `max_score` | = `40` |
| VII-1.3 | UserQuizAttempt trong DB | `total_score=40`, `finished_at` không null |
| VII-1.4 | UserQuizAnswer trong DB | 3 records với score_obtained = 10, 20, 10 |

### VII-2 · Zero score (tất cả sai)

1. Kết nối WS với Quiz 1
2. Auth + Start
3. Answer Q1 sai, Next
4. Answer Q2 chỉ chọn 1 option, Next
5. Answer Q3 sai ("login"), Next
6. Nhận finish event

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VII-2.1 | `total_score` | = `0` |
| VII-2.2 | UserQuizAnswer scores | Tất cả `score_obtained=0` |

### VII-3 · Partial score

Trả lời Q1 đúng (10 pts), Q2 sai (0 pts), Q3 đúng (10 pts):

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VII-3.1 | `total_score` | = `20` |
| VII-3.2 | DB verification | `UserQuizAnswer`: score_obtained = 10, 0, 10 |

---

## PHẦN VIII — Progress Tracking & Signals

> **Mục đích:** Xác minh Django signal tự cập nhật `UserQuizProgress` sau mỗi attempt.

### VIII-1 · Progress sau attempt đầu tiên

1. member1 chưa có progress với Quiz 1 → `GET /api/quiz/quizzes/1/progress/` trả `attempt_count=0`
2. Hoàn thành 1 session với score=30
3. `GET /api/quiz/quizzes/1/progress/` lại

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VIII-1.1 | `attempt_count` | = `1` |
| VIII-1.2 | `best_score` | = `30` |
| VIII-1.3 | `first_attempted_at` | Không null |
| VIII-1.4 | `last_attempted_at` | Không null |
| VIII-1.5 | `completed_at` | Không null (attempt đã finish) |

### VIII-2 · Best score update (nhiều attempt)

1. Attempt 1: score=20, hoàn thành
2. Attempt 2: score=35, hoàn thành
3. Attempt 3: score=25, hoàn thành

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VIII-2.1 | `best_score` sau attempt 2 | = `35` (cập nhật từ 20) |
| VIII-2.2 | `best_score` sau attempt 3 | Vẫn = `35` (25 < 35, không override) |
| VIII-2.3 | `attempt_count` | = `3` |
| VIII-2.4 | `last_attempted_at` | Thời gian của attempt 3 (mới nhất) |

### VIII-3 · Progress isolation giữa các user

1. member1 hoàn thành Quiz 1 với score=40
2. member2 GET progress của Quiz 1

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VIII-3.1 | member2's progress | `attempt_count=0`, `best_score=0` (không bị ảnh hưởng bởi member1) |
| VIII-3.2 | DB | 2 `UserQuizProgress` records (user_id khác nhau, quiz_id=1) |

### VIII-4 · Progress isolation giữa các quiz

1. member1 hoàn thành Quiz 1
2. GET progress Quiz 2 (chưa thử)

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VIII-4.1 | Quiz 2 progress | `attempt_count=0`, `best_score=0` |

---

## PHẦN IX — Frontend Integration (User Surface)

> **Yêu cầu:** MSW tắt (`NEXT_PUBLIC_USE_MSW=false`), backend đang chạy.
> **User test:** Đăng nhập với `member1 / member1234`.

### IX-1 · Quiz Catalog

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-1.1 | Đăng nhập member1, mở `/vi/quizzes` | Trang load, hiển thị quiz cards từ **real backend** |
| IX-1.2 | Đếm quiz cards | 4 cards (Quiz 1, 2, 3, 5 — published; Quiz 4 draft bị ẩn) |
| IX-1.3 | Nội dung card Quiz 1 | Title "OWASP Basics Quiz", hiển thị đúng metadata |
| IX-1.4 | Không có 404/500 trong console | Network tab: tất cả API calls `200 OK` |
| IX-1.5 | Search "owasp" | Chỉ còn Quiz 1 (filter qua backend hoặc client-side) |
| IX-1.6 | Filter time ≤ 10 phút | Chỉ Quiz 2 (600s) và Quiz 5 (300s) — kiểm tra thực tế |
| IX-1.7 | Click quiz card | Điều hướng tới `/vi/quizzes/{id}` |

### IX-2 · Quiz Detail

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-2.1 | Mở `/vi/quizzes/1` | Hiển thị "OWASP Basics Quiz" với 3 câu hỏi, 100 điểm, 15 phút |
| IX-2.2 | Progress card (lần đầu) | "Chưa có lượt thử" (attempt_count=0 từ backend) |
| IX-2.3 | Sau khi hoàn thành session | Reload trang, progress card cập nhật (attempt_count=1) |
| IX-2.4 | `/vi/quizzes/4` (draft) | 404/error state (member không thấy draft) |
| IX-2.5 | `/vi/quizzes/9999` | Error state với link quay lại |

### IX-3 · Quiz Session — Single Choice

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-3.1 | Click "Bắt đầu luyện tập" trên Quiz 1 | Điều hướng tới `/vi/quizzes/1/session` |
| IX-3.2 | WS handshake | Spinner "Đang kết nối..." → "Đang xác thực..." → câu hỏi hiện ra |
| IX-3.3 | Câu hỏi đầu tiên | Single choice, 3 radio options |
| IX-3.4 | Chưa chọn gì | Nút Submit disabled |
| IX-3.5 | Chọn đáp án sai, Submit | Hiển thị result card: ❌, score=0, explanation |
| IX-3.6 | Chọn đáp án đúng, Submit | Hiển thị result card: ✅, score=10, explanation |
| IX-3.7 | Click "Câu tiếp theo" | Câu 2 xuất hiện, progress "Câu 2/3" |

### IX-4 · Quiz Session — Multi Choice

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-4.1 | Câu 2 (Q2) | Hiển thị checkbox (không phải radio) |
| IX-4.2 | Chọn chỉ 1 trong 2 đáp án đúng | Submit → ❌ sai |
| IX-4.3 | Chọn đúng 2 đáp án đúng | Submit → ✅ đúng, score=20 |

### IX-5 · Quiz Session — Fill Blank

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-5.1 | Câu 3 (Q3) | Hiển thị text input |
| IX-5.2 | Nhập "" (trống) | Submit disabled |
| IX-5.3 | Nhập "authentication" | Submit → ✅ đúng |
| IX-5.4 | Nhập "Authentication" (hoa) | Submit → ✅ đúng (case_sensitive=false) |

### IX-6 · Quiz Finish Screen

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-6.1 | Hoàn thành tất cả 3 câu hỏi | Màn hình kết quả hiển thị |
| IX-6.2 | Score hiển thị | Đúng với tổng điểm đã đạt được |
| IX-6.3 | max_score | = 40 |
| IX-6.4 | duration_sec | Số giây hợp lý (> 0) |
| IX-6.5 | Click "Quay lại" | Điều hướng về `/vi/quizzes/1` |
| IX-6.6 | Click "Thử lại" | Điều hướng về `/vi/quizzes/1/session` với session MỚI (câu hỏi bắt đầu từ đầu, WS remount) |
| IX-6.7 | Sau khi quay lại trang detail | Progress card cập nhật: attempt_count tăng, best_score cập nhật |

### IX-7 · Quiz không có câu hỏi (Empty Quiz)

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| IX-7.1 | Mở `/vi/quizzes/5/session` | WS kết nối, gửi start |
| IX-7.2 | Server response | Nhận ngay `{"type": "finish", "total_score": 0, "max_score": 0}` |
| IX-7.3 | Frontend | Hiển thị finish screen với 0/0 |

---

## PHẦN X — Frontend Integration (Admin Surface)

> **User test:** Đăng nhập với `admin / admin1234` hoặc `editor1 / editor1234`.

### X-1 · Admin Quiz List

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| X-1.1 | Mở `/vi/admin/quizzes` (đăng nhập admin) | Table load với **5 quizzes** (bao gồm cả draft) |
| X-1.2 | Cột Status | Badge "Draft" với màu khác cho Quiz 4 |
| X-1.3 | Filter "Draft" | Chỉ hiện Quiz 4 |
| X-1.4 | Filter "Published" | Hiện Quiz 1, 2, 3, 5 |
| X-1.5 | Filter "Archived" | Empty state |
| X-1.6 | Filter "All" | 5 quizzes |
| X-1.7 | Search "forensics" | Chỉ hiện "Advanced Forensics" |
| X-1.8 | Nút "Sửa" Quiz 1 | Điều hướng `/vi/admin/quizzes/1` |
| X-1.9 | Nút "Quản lý câu hỏi" Quiz 1 | Điều hướng `/vi/admin/quizzes/1/questions` |

### X-2 · Tạo Quiz mới (Admin)

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| X-2.1 | Click "Tạo quiz" | Điều hướng `/vi/admin/quizzes/new` |
| X-2.2 | Form mặc định | Status=Draft, Quiz Point=10, Time Limit=0 |
| X-2.3 | Để trống title, click Submit | Nút disabled (không submit được) |
| X-2.4 | Điền Title="Test API Quiz", Status=Published, Points=75 | Submit enabled |
| X-2.5 | Submit | POST đến backend → 201, redirect tới trang edit quiz mới |
| X-2.6 | Mở `/vi/admin/quizzes` lại | Quiz mới xuất hiện trong danh sách |
| X-2.7 | Mở `/vi/quizzes` với member | Quiz mới (published) xuất hiện trong catalog |

### X-3 · Edit Quiz metadata (Admin)

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| X-3.1 | Mở `/vi/admin/quizzes/1` | Form pre-fill đúng: "OWASP Basics Quiz", Published, 100pts, 900s |
| X-3.2 | Đổi title → "OWASP Basics v2", Points → 150 | Submit → PATCH → success |
| X-3.3 | Reload trang | Form hiển thị giá trị mới |
| X-3.4 | Kiểm tra trong admin list | Title cập nhật |

### X-4 · Quản lý câu hỏi (Admin)

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| X-4.1 | Mở `/vi/admin/quizzes/1/questions` | Hiển thị 3 câu hỏi (Q1, Q2, Q3) |
| X-4.2 | Cột Type | Badge "Single Choice", "Multi Choice", "Fill Blank" đúng cho từng câu |
| X-4.3 | Thêm câu hỏi single_choice | Dialog mở, điền đầy đủ, Save → câu hỏi mới xuất hiện |
| X-4.4 | total_questions Quiz 1 | Tăng từ 3 lên 4 (kiểm tra header hoặc admin quiz edit page) |
| X-4.5 | Thêm fill_blank, bỏ trống answers | Validation error |
| X-4.6 | Sửa Q1 | Dialog pre-fill đúng, save → cập nhật trong table |
| X-4.7 | Xóa Q3 | Confirm → Q3 biến mất, total_questions giảm |

### X-5 · Xóa Quiz (Admin)

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| X-5.1 | Trong admin list, click Xóa Quiz 5 | Confirm dialog hiển thị tên "Empty Quiz" (không phải literal `{title}`) |
| X-5.2 | Xác nhận xóa | Quiz 5 biến mất khỏi list, counter giảm |
| X-5.3 | Kiểm tra user catalog | "Empty Quiz" không còn trong `/vi/quizzes` |
| X-5.4 | Xóa Quiz 1 (có questions + attempts) | 204 OK, questions bị cascade-delete |

---

## PHẦN XI — Cross-feature & End-to-End Flows

### XI-1 · Flow đầy đủ: Tạo → Publish → Học → Kiểm tra progress

| # | Thao tác | Actor | Kết quả mong đợi |
|---|---------|-------|-----------------|
| XI-1.1 | Admin tạo quiz mới "E2E Test Quiz" (draft) | Admin | Quiz tạo thành công, id mới |
| XI-1.2 | Admin thêm 2 câu hỏi (1 single, 1 fill_blank) | Admin | 2 câu, total_questions=2 |
| XI-1.3 | Admin publish quiz (PATCH status=published) | Admin | Status cập nhật |
| XI-1.4 | member1 xem catalog | Member1 | "E2E Test Quiz" xuất hiện |
| XI-1.5 | member1 vào detail page | Member1 | 2 câu, progress card "Chưa có lượt thử" |
| XI-1.6 | member1 làm quiz, hoàn thành với score đầy đủ | Member1 | Finish screen hiển thị |
| XI-1.7 | member1 xem detail page lại | Member1 | Progress: attempt_count=1, best_score cập nhật |
| XI-1.8 | member2 xem cùng quiz | Member2 | Progress của member2: attempt_count=0 |

### XI-2 · Flow: Config max_attempt → enforce

| # | Thao tác | Actor | Kết quả mong đợi |
|---|---------|-------|-----------------|
| XI-2.1 | member1 set max_attempt=2 cho Quiz 2 | Member1 | Config saved |
| XI-2.2 | Hoàn thành attempt 1 | Member1 | Finish, progress cập nhật |
| XI-2.3 | Hoàn thành attempt 2 | Member1 | Finish, attempt_count=2 |
| XI-2.4 | Cố gắng start attempt 3 | Member1 | WS đóng với 4003 / Frontend hiển thị lỗi |
| XI-2.5 | member2 với Quiz 2 (chưa cấu hình) | Member2 | Không bị giới hạn (config độc lập) |

### XI-3 · Flow: Editor update question → User thấy câu mới

| # | Thao tác | Actor | Kết quả mong đợi |
|---|---------|-------|-----------------|
| XI-3.1 | Editor PUT Q1 với explanation mới | Editor | Q1 cập nhật |
| XI-3.2 | member1 bắt đầu session mới Quiz 1 | Member1 | Làm Q1, Submit → explanation mới xuất hiện trong answer_result |

### XI-4 · Flow: Delete quiz đang active

| # | Thao tác | Actor | Kết quả mong đợi |
|---|---------|-------|-----------------|
| XI-4.1 | member1 đang trong WS session Quiz 3 | Member1 | Đang connected |
| XI-4.2 | Admin xóa Quiz 3 | Admin | 204 OK |
| XI-4.3 | member1 tiếp tục session | Member1 | WS có thể gặp lỗi ở lần answer tiếp theo (quiz không còn tồn tại) — kiểm tra behavior |

---

## PHẦN XII — Edge Cases & Security

### XII-1 · Token security trong WS

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| XII-1.1 | Kết nối WS với token trong URL query string | Không nên có behavior này — protocol dùng first-message auth |
| XII-1.2 | Gửi 2 auth messages liên tiếp | Server chỉ xử lý auth một lần (second auth bị ignore hoặc error) |
| XII-1.3 | Gửi action trước khi auth | Server đóng kết nối hoặc trả error |

### XII-2 · Answer validation edge cases

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| XII-2.1 | Answer với `question_id` thuộc quiz khác | Server trả error |
| XII-2.2 | Answer cùng câu hỏi 2 lần trong 1 attempt | Server chặn (UniqueConstraint attempt+question) |
| XII-2.3 | Answer với `option_id` không thuộc câu hỏi | Coi là sai hoặc error |
| XII-2.4 | `answer.option_ids=[]` cho single_choice | Error hoặc `is_correct=false` |

### XII-3 · Concurrent sessions

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| XII-3.1 | member1 mở 2 tab cùng lúc, cùng Quiz 1 | Mỗi tab có `attempt_id` riêng biệt |
| XII-3.2 | Hoàn thành cả 2 sessions | 2 `UserQuizAttempt` records trong DB |

### XII-4 · Input sanitization

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| XII-4.1 | Quiz title chứa `<script>alert(1)</script>` | Backend lưu as-is, Frontend render escaped (không execute JS) |
| XII-4.2 | Fill blank answer chứa SQL injection `'; DROP TABLE--` | Backend xử lý as string, không có SQL error |
| XII-4.3 | Content JSONB với nested object lớn | Backend validate và reject nếu không đúng schema |

### XII-5 · Lỗi mạng / reconnect

| # | Thao tác | Kết quả mong đợi |
|---|---------|-----------------|
| XII-5.1 | Kill backend trong khi đang session WS | Frontend hiển thị error state, nút quay lại |
| XII-5.2 | Restart backend, member reload trang | Session mới được tạo (attempt_id mới) |
| XII-5.3 | Tắt internet trong khi làm quiz | onclose event → error UI |

---

## Checklist tổng hợp

Dùng để track tiến độ test. Đánh dấu `[x]` khi pass, `[!]` khi fail, `[-]` khi skip.

### Backend API (curl/Postman)
- [ ] I — Auth & RBAC (I-1 đến I-4)
- [ ] II — Quiz CRUD (II-1 đến II-6)
- [ ] III — Question CRUD (III-1 đến III-5)
- [ ] IV — Config & Progress API (IV-1 đến IV-3)
- [ ] V — QuizNode Tree (V-1 đến V-2)

### WebSocket Protocol
- [ ] VI — WS session protocol (VI-1 đến VI-8)
- [ ] VII — Scoring engine (VII-1 đến VII-3)
- [ ] VIII — Progress tracking & signals (VIII-1 đến VIII-4)

### Frontend Integration
- [ ] IX — User surface (IX-1 đến IX-7)
- [ ] X — Admin surface (X-1 đến X-5)
- [ ] XI — Cross-feature E2E flows (XI-1 đến XI-4)
- [ ] XII — Edge cases & security (XII-1 đến XII-5)

---

## Ghi chú tái sử dụng

- **Reset nhanh giữa các test WS:** Mở tab mới (tránh state từ session cũ).
- **Reset database nhanh:** `python manage.py flush --no-input && python manage.py seed_config && python manage.py seed_roles` rồi chạy lại shell script seed data.
- **Kiểm tra DB trực tiếp:** `python manage.py shell -c "from api.models import *; print(UserQuizProgress.objects.all().values())"`.
- **Bugs đã biết (active):**
  - H1: `IsAdminUser` check có thể gây 403 cho admin user nếu `is_staff=False` — dùng superuser để bypass trong khi chờ fix.
  - H3: Admin route authorization bypass ở frontend (non-admin có thể access admin pages) — chỉ test admin features với account có đúng role.
