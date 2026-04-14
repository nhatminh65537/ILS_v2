# Integration Test Checklist — Slice 8: User Profile, Session Management & Admin Users (Full Stack)

> **Môi trường:** Frontend + Backend thật (không dùng MSW). MSW phải được tắt.
> **Backend:** Django/Daphne @ `http://localhost:8000`
> **Frontend:** Next.js @ `http://localhost:4000` với `NEXT_PUBLIC_USE_MSW=false`
> **Ngày tạo:** 2026-04-14
> **Tham chiếu:** `docs/prd/08-user-profile.md`, `docs/API.md`, `docs/DATA_MODEL.md`, `docs/STATUS.md`

---

## Mục lục

1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Dữ liệu kiểm thử chuẩn](#2-dữ-liệu-kiểm-thử-chuẩn)
3. [PHẦN I — Xác thực & Phân quyền API](#phần-i--xác-thực--phân-quyền-api)
4. [PHẦN II — User Profile API (me endpoints)](#phần-ii--user-profile-api-me-endpoints)
5. [PHẦN III — Public Profile API](#phần-iii--public-profile-api)
6. [PHẦN IV — Activity Feed API](#phần-iv--activity-feed-api)
7. [PHẦN V — Admin User Management API](#phần-v--admin-user-management-api)
8. [PHẦN VI — Session Management API](#phần-vi--session-management-api)
9. [PHẦN VII — Frontend: Public Profile (`/profile/[username]`)](#phần-vii--frontend-public-profile-profileusername)
10. [PHẦN VIII — Frontend: Profile Settings (`/profile/settings`)](#phần-viii--frontend-profile-settings-profilesettings)
11. [PHẦN IX — Frontend: Session Management (`/profile/sessions`)](#phần-ix--frontend-session-management-profilesessions)
12. [PHẦN X — Frontend: Admin Users (`/admin/users`)](#phần-x--frontend-admin-users-adminusers)
13. [PHẦN XI — Cross-feature & End-to-End Flows](#phần-xi--cross-feature--end-to-end-flows)
14. [PHẦN XII — Edge Cases & Security](#phần-xii--edge-cases--security)

---

## 1. Chuẩn bị môi trường

### 1.1 Khởi động server

```bash
# Terminal 1 — Backend (dùng runserver hoặc daphne đều được cho Slice 8 vì không cần WebSocket)
cd backend
source ../.venv/bin/activate        # Unix
# ..\\.venv\\Scripts\\activate       # Windows
python manage.py runserver           # hoặc: daphne -p 8000 backend.asgi:application

# Terminal 2 — Frontend (tắt MSW)
cd frontend
# Windows PowerShell:
$env:NEXT_PUBLIC_USE_MSW="false"; npm run dev
# Hoặc set trong .env.local: NEXT_PUBLIC_USE_MSW=false
# Sau đó: npm run dev
```

> **Lưu ý:** Slice 8 không dùng WebSocket, nên `python manage.py runserver` là đủ. Tuy nhiên nếu test E2E cùng với Slice 7 thì dùng Daphne.

### 1.2 Kiểm tra MSW đã tắt

| Thao tác | Mục đích | Kết quả mong đợi |
|----------|---------|-----------------|
| Mở DevTools → Network | Xác nhận requests không bị MSW intercept | Requests đến `localhost:8000` thật |
| Console không có `[MSW]` | Xác nhận MSW inactive | Không có log MSW |

### 1.3 Biến môi trường cần kiểm tra

```bash
# frontend/.env.local (hoặc .env.development)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MSW=false
```

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
```

### 2.2 Seed dữ liệu kiểm thử

```bash
# Từ thư mục backend/
python manage.py shell -c "
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import (
    Role, UserRole, UserProfile,
    Course, CourseNode, Lesson, UserLessonProgress,
    Challenge, UserChallengeProgress,
    Quiz, QuizCategory, UserQuizProgress,
)

User = get_user_model()

# ----------------------------------------------------------------
# Users
# ----------------------------------------------------------------
admin = User.objects.create_superuser('admin', 'admin@test.local', 'admin1234')
editor = User.objects.create_user('editor1', 'editor@test.local', 'editor1234')
member1 = User.objects.create_user('member1', 'member1@test.local', 'member1234')
member2 = User.objects.create_user('member2', 'member2@test.local', 'member1234')
member3 = User.objects.create_user('member3', 'member3@test.local', 'member1234')

# is_active=False user (để test disabled user flow)
disabled_user = User.objects.create_user('disableduser', 'disabled@test.local', 'disabled1234')
disabled_user.is_active = False
disabled_user.save()

# ----------------------------------------------------------------
# Roles
# ----------------------------------------------------------------
role_admin = Role.objects.get(name='Admin')
role_editor = Role.objects.get(name='Editor')
role_member = Role.objects.get(name='Member')

UserRole.objects.create(user=admin, role=role_admin)
UserRole.objects.create(user=editor, role=role_editor)
UserRole.objects.create(user=member1, role=role_member)
UserRole.objects.create(user=member2, role=role_member)
UserRole.objects.create(user=member3, role=role_member)
UserRole.objects.create(user=disabled_user, role=role_member)

# ----------------------------------------------------------------
# UserProfiles (get_or_create để an toàn)
# ----------------------------------------------------------------
admin_profile, _ = UserProfile.objects.get_or_create(user=admin)
admin_profile.display_name = 'Admin User'
admin_profile.bio = 'System administrator'
admin_profile.location = 'Hanoi'
admin_profile.website = 'https://ils.local'
admin_profile.entry_year = 2023
admin_profile.language = 'vi'
admin_profile.theme = 'system'
admin_profile.timezone = 'Asia/Ho_Chi_Minh'
admin_profile.total_learning_point = 300
admin_profile.total_challenge_point = 500
admin_profile.total_quiz_point = 120
admin_profile.course_completed = 5
admin_profile.challenge_completed = 10
admin_profile.quiz_completed = 6
admin_profile.save()

m1_profile, _ = UserProfile.objects.get_or_create(user=member1)
m1_profile.display_name = 'Member One'
m1_profile.bio = 'Security enthusiast'
m1_profile.location = 'HCMC'
m1_profile.entry_year = 2024
m1_profile.language = 'vi'
m1_profile.theme = 'dark'
m1_profile.timezone = 'Asia/Ho_Chi_Minh'
m1_profile.total_learning_point = 150
m1_profile.total_challenge_point = 200
m1_profile.total_quiz_point = 80
m1_profile.course_completed = 2
m1_profile.challenge_completed = 5
m1_profile.quiz_completed = 3
m1_profile.save()

m2_profile, _ = UserProfile.objects.get_or_create(user=member2)
# member2: profile tối giản (display_name=None)
m2_profile.save()

UserProfile.objects.get_or_create(user=member3)
UserProfile.objects.get_or_create(user=editor)
UserProfile.objects.get_or_create(user=disabled_user)

# ----------------------------------------------------------------
# Course (slug là required, unique)
# Lesson KHÔNG có FK course — liên kết qua CourseNode (tree node)
# Nhưng để seed activity feed, chỉ cần Lesson objects (UserLessonProgress.lesson FK)
# ----------------------------------------------------------------
course1 = Course.objects.create(
    slug='web-security-101',
    title='Web Security 101',
    status='published',
)

# Tạo 3 Lessons (lesson_type required; KHÔNG có course FK, KHÔNG có status field)
lesson1 = Lesson.objects.create(
    title='Injection Basics',
    lesson_type='markdown',
    content_md='Introduction to injection attacks.',
)
lesson2 = Lesson.objects.create(
    title='XSS Fundamentals',
    lesson_type='markdown',
    content_md='Cross-site scripting fundamentals.',
)
lesson3 = Lesson.objects.create(
    title='Broken Access Control',
    lesson_type='markdown',
    content_md='Broken access control explained.',
)

# Đặt lessons vào cây của course qua CourseNode
# (cần để lesson xuất hiện đúng trong context course — không bắt buộc cho activity feed test)
root_folder = CourseNode.objects.create(
    course=course1, parent=None, is_item=False,
    title='Web Security 101', position=0, path='',
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson1, title='Injection Basics',
    position=0, path=str(root_folder.id),
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson2, title='XSS Fundamentals',
    position=1, path=str(root_folder.id),
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson3, title='Broken Access Control',
    position=2, path=str(root_folder.id),
)

# ----------------------------------------------------------------
# Challenges (slug và storage_path là required; KHÔNG có field flag trực tiếp)
# Flag được lưu qua model ChallengeFlag riêng — không cần cho test activity feed
# ----------------------------------------------------------------
challenge1 = Challenge.objects.create(
    slug='sql-injection-lab',
    title='SQL Injection Lab',
    status='published',
    storage_path='challenges/sql-injection-lab',
    difficulty='easy',
)
challenge2 = Challenge.objects.create(
    slug='jwt-pwn',
    title='JWT Pwn',
    status='published',
    storage_path='challenges/jwt-pwn',
    difficulty='medium',
)

# ----------------------------------------------------------------
# Quiz (không có slug; category là FK nullable)
# ----------------------------------------------------------------
cat = QuizCategory.objects.create(name='Web Security')
quiz1 = Quiz.objects.create(
    title='OWASP Basics Quiz',
    status='published',
    category=cat,
    quiz_point=100,
    total_questions=0,
)

# ----------------------------------------------------------------
# Activity Feed data cho member1 (6 sự kiện)
# is_completed là @property tính từ completed_at — KHÔNG phải DB field
# UserLessonProgress.started_at nullable; UserChallengeProgress không có started_at
# UserQuizProgress fields: best_score, attempt_count, first_attempted_at, last_attempted_at, completed_at
# ----------------------------------------------------------------
now = timezone.now()

# Lesson completions (started_at nullable; completed_at drives activity feed)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson1,
    started_at=now - timedelta(days=5),
    completed_at=now - timedelta(days=5),
)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson2,
    started_at=now - timedelta(days=3),
    completed_at=now - timedelta(days=3),
)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson3,
    started_at=now - timedelta(days=1),
    completed_at=now - timedelta(days=1),
)

# Challenge completions (chỉ có completed_at; không có started_at)
UserChallengeProgress.objects.create(
    user=member1, challenge=challenge1,
    completed_at=now - timedelta(days=4),
)
UserChallengeProgress.objects.create(
    user=member1, challenge=challenge2,
    completed_at=now - timedelta(days=2),
)

# Quiz completion (best_score, attempt_count thay vì score/total_answered)
UserQuizProgress.objects.create(
    user=member1, quiz=quiz1,
    best_score=85,
    attempt_count=1,
    first_attempted_at=now - timedelta(days=6),
    last_attempted_at=now - timedelta(days=6),
    completed_at=now - timedelta(days=6),
)

print('=== Seed hoàn tất ===')
print(f'admin.id={admin.id}, member1.id={member1.id}, member2.id={member2.id}')
print(f'lesson1.id={lesson1.id}, challenge1.id={challenge1.id}, quiz1.id={quiz1.id}')
"
```

### 2.3 Tạo sessions cho kiểm thử session management

```bash
# Từ thư mục backend/
python manage.py shell -c "
from django.contrib.auth import get_user_model
from auth_app.services.session_service import SessionService
from auth_app.services.token_service import TokenService

User = get_user_model()
member1 = User.objects.get(username='member1')

svc = TokenService()
session_svc = SessionService()

# Session 1 — sẽ trở thành current session khi member1 đăng nhập qua FE
# Session 2 — giả lập thiết bị thứ 2 (Safari on iPhone)
tokens2 = svc.issue_tokens(member1)
session_svc.create_session(
    user=member1,
    refresh_token=tokens2['refresh'],
    device_info='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
)

# Session 3 — giả lập thiết bị thứ 3 (Firefox on Linux)
tokens3 = svc.issue_tokens(member1)
session_svc.create_session(
    user=member1,
    refresh_token=tokens3['refresh'],
    device_info='Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
)

print('Sessions đã tạo cho member1')
from api.models import UserSession
for s in UserSession.objects.filter(user=member1, revoked_at__isnull=True):
    print(f'  Session id={s.id}, device={s.device_info[:40]}...')
"
```

> **Lưu ý:** Khi member1 đăng nhập qua Frontend (hoặc `POST /api/auth/login/`), một session thứ nhất (current session) sẽ được tạo tự động. Lúc này member1 có tổng cộng **3 sessions** — 1 current + 2 được seed ở trên.

### 2.4 Tóm tắt dữ liệu kiểm thử

| Loại | Tên / Giá trị | Ghi chú |
|------|---------------|---------|
| **admin** | username=`admin`, pass=`admin1234` | Role: Admin, is_superuser=True |
| **editor1** | username=`editor1`, pass=`editor1234` | Role: Editor |
| **member1** | username=`member1`, pass=`member1234` | Role: Member, có profile đầy đủ, 6 activities |
| **member2** | username=`member2`, pass=`member1234` | Role: Member, profile tối giản |
| **member3** | username=`member3`, pass=`member1234` | Role: Member, profile trống |
| **disableduser** | username=`disableduser`, pass=`disabled1234` | Role: Member, `is_active=False` |
| **Sessions member1** | 3 sessions | 1 current (từ đăng nhập FE) + 2 từ seed |
| **Activities member1** | 6 sự kiện | 3 lesson, 2 challenge, 1 quiz |
| **Profile member1** | `display_name="Member One"`, `location="HCMC"`, ... | Xem script seed |

---

## PHẦN I — Xác thực & Phân quyền API

> **Công cụ:** curl hoặc Postman. Thay `ACCESS_TOKEN` bằng token thật từ `POST /api/auth/login/`.

### Lấy tokens để test

```bash
# Lấy token cho member1
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"member1","password":"member1234"}' | python -m json.tool

# Lấy token cho admin
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}' | python -m json.tool
```

> Lưu `access` token vào biến `MEMBER1_TOKEN` và `ADMIN_TOKEN` để dùng trong các lệnh curl phía dưới.

### I-1 · Unauthenticated access

| # | Request | Kết quả mong đợi |
|---|---------|-----------------|
| I-1-1 | `GET /api/users/me/profile/` — không có Authorization header | `401 Unauthorized` |
| I-1-2 | `PATCH /api/users/me/settings/` — không có Authorization header | `401 Unauthorized` |
| I-1-3 | `GET /api/users/me/activity/` — không có Authorization header | `401 Unauthorized` |
| I-1-4 | `GET /api/admin/users/` — không có Authorization header | `401 Unauthorized` |
| I-1-5 | `GET /api/auth/sessions/` — không có Authorization header | `401 Unauthorized` |
| I-1-6 | `GET /api/users/member1/profile/` — không có Authorization header | `200 OK` (public, không cần auth) |
| I-1-7 | `GET /api/users/member1/activity/` — không có Authorization header | `200 OK` (public, không cần auth) |

### I-2 · Non-admin truy cập admin endpoints

```bash
# Dùng MEMBER1_TOKEN
curl -X GET http://localhost:8000/api/admin/users/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Request | Kết quả mong đợi |
|---|---------|-----------------|
| I-2-1 | `GET /api/admin/users/` với member1 token | `403 Forbidden` |
| I-2-2 | `POST /api/admin/users/` với member1 token | `403 Forbidden` |
| I-2-3 | `GET /api/admin/users/1/` với member1 token | `403 Forbidden` |
| I-2-4 | `PATCH /api/admin/users/1/` với member1 token | `403 Forbidden` |

### I-3 · Admin truy cập admin endpoints

```bash
# Dùng ADMIN_TOKEN
curl -X GET http://localhost:8000/api/admin/users/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

| # | Request | Kết quả mong đợi |
|---|---------|-----------------|
| I-3-1 | `GET /api/admin/users/` với admin token | `200 OK`, trả về danh sách users |
| I-3-2 | `GET /api/admin/users/{member1_id}/` với admin token | `200 OK`, trả về user + profile + roles |

### I-4 · Cross-user session isolation

| # | Request | Kết quả mong đợi |
|---|---------|-----------------|
| I-4-1 | `GET /api/auth/sessions/` với member1 token | Chỉ trả về sessions của **member1** (không thấy sessions của user khác) |
| I-4-2 | `DELETE /api/auth/sessions/{session_id_of_member2}/` với member1 token | `404 Not Found` (không được revoke session của người khác) |

---

## PHẦN II — User Profile API (me endpoints)

### II-1 · GET /api/users/me/profile/

```bash
curl -X GET http://localhost:8000/api/users/me/profile/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-1-1 | HTTP status | `200 OK` |
| II-1-2 | Trường `user_id` | Bằng ID của member1 |
| II-1-3 | Trường `username` | `"member1"` |
| II-1-4 | Trường `display_name` | `"Member One"` |
| II-1-5 | Trường `bio` | `"Security enthusiast"` |
| II-1-6 | Trường `location` | `"HCMC"` |
| II-1-7 | Trường `entry_year` | `2024` |
| II-1-8 | Trường `language` | `"vi"` |
| II-1-9 | Trường `theme` | `"dark"` |
| II-1-10 | Trường `timezone` | `"Asia/Ho_Chi_Minh"` |
| II-1-11 | Trường `total_learning_point` | `150` |
| II-1-12 | Trường `total_challenge_point` | `200` |
| II-1-13 | Trường `total_quiz_point` | `80` |
| II-1-14 | Trường `course_completed` | `2` |
| II-1-15 | Trường `challenge_completed` | `5` |
| II-1-16 | Trường `quiz_completed` | `3` |
| II-1-17 | Không có trường `refresh_token_hash` hay `password` | Không xuất hiện trong response |

### II-2 · PATCH /api/users/me/profile/ — Cập nhật profile

```bash
curl -X PATCH http://localhost:8000/api/users/me/profile/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"Updated Name","bio":"New bio text","location":"Da Nang","entry_year":2025}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-2-1 | HTTP status | `200 OK` |
| II-2-2 | `display_name` trong response | `"Updated Name"` |
| II-2-3 | `bio` trong response | `"New bio text"` |
| II-2-4 | `location` trong response | `"Da Nang"` |
| II-2-5 | `entry_year` trong response | `2025` |
| II-2-6 | Points fields không thay đổi | Vẫn giữ nguyên giá trị cũ |
| II-2-7 | Verify bằng GET sau khi PATCH | `GET /api/users/me/profile/` trả về giá trị mới |

**Test validation:**

```bash
# entry_year quá nhỏ
curl -X PATCH http://localhost:8000/api/users/me/profile/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entry_year":1999}'

# Xóa display_name (optional field)
curl -X PATCH http://localhost:8000/api/users/me/profile/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name":null,"bio":""}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-2-8 | PATCH với `entry_year=1999` | `400 Bad Request` hoặc giá trị được lưu (tùy validation — kiểm tra DATA_MODEL) |
| II-2-9 | PATCH với `display_name=null` | `200 OK` (display_name nullable) |
| II-2-10 | PATCH chỉ gửi một trường (partial) | `200 OK`, các trường khác không bị xóa |

### II-3 · PATCH /api/users/me/settings/ — Cài đặt app

```bash
curl -X PATCH http://localhost:8000/api/users/me/settings/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language":"en","theme":"light","timezone":"UTC"}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-3-1 | HTTP status | `200 OK` |
| III-3-2 | `language` trong response | `"en"` |
| III-3-3 | `theme` trong response | `"light"` |
| III-3-4 | `timezone` trong response | `"UTC"` |
| III-3-5 | Verify với `GET /api/users/me/profile/` | Các trường đã thay đổi |
| III-3-6 | PATCH với `language="fr"` (không hợp lệ) | `400 Bad Request` |
| III-3-7 | PATCH với `theme="blue"` (không hợp lệ) | `400 Bad Request` |

### II-4 · PATCH /api/users/me/account/ — Đổi username/email

```bash
# Đổi username
curl -X PATCH http://localhost:8000/api/users/me/account/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"member1_new"}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| II-4-1 | Đổi username hợp lệ | `200 OK`, trả về User object với `username="member1_new"` |
| II-4-2 | Đổi email hợp lệ | `200 OK`, trả về User object với email mới |
| II-4-3 | Đổi username trùng `admin` | `400 Bad Request` với lỗi field `username` |
| II-4-4 | Đổi email trùng `admin@test.local` | `400 Bad Request` với lỗi field `email` |
| II-4-5 | PATCH không gửi field nào (body rỗng) | `400 Bad Request` ("At least one field must be provided") |
| II-4-6 | Sau khi đổi username — đăng nhập lại | Phải dùng username mới để đăng nhập |
| II-4-7 | Response không chứa field `profile` | `UserSerializer` trả về user object (không phải profile) |

> **Quan trọng:** Sau test II-4-1 nếu đã đổi username thành `member1_new`, hãy đổi lại thành `member1` trước các test tiếp theo:
> ```bash
> curl -X PATCH http://localhost:8000/api/users/me/account/ \
>   -H "Authorization: Bearer $MEMBER1_NEW_TOKEN" \
>   -H "Content-Type: application/json" \
>   -d '{"username":"member1"}'
> ```

---

## PHẦN III — Public Profile API

### III-1 · GET /api/users/{username}/profile/ — Không cần auth

```bash
curl -X GET http://localhost:8000/api/users/member1/profile/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-1-1 | HTTP status | `200 OK` |
| III-1-2 | Trường `username` | `"member1"` |
| III-1-3 | Trường `display_name` | `"Member One"` |
| III-1-4 | Trường `total_learning_point` | `150` |
| III-1-5 | **Không có** trường `email` | Email KHÔNG được trả về trong public profile |
| III-1-6 | **Không có** trường `language`, `theme`, `timezone` | Các cài đặt riêng tư không trả về |
| III-1-7 | Có đầy đủ 6 trường stats | `total_learning_point`, `total_challenge_point`, `total_quiz_point`, `course_completed`, `challenge_completed`, `quiz_completed` |

```bash
# Profile của member2 (display_name = null)
curl -X GET http://localhost:8000/api/users/member2/profile/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-1-8 | `display_name` của member2 | `null` (tối giản) |
| III-1-9 | Stats của member2 | Tất cả = `0` (chưa hoạt động) |

```bash
# Profile của user không tồn tại
curl -X GET http://localhost:8000/api/users/nonexistentuser/profile/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-1-10 | HTTP status cho username không tồn tại | `404 Not Found` |

```bash
# Profile của disabled user
curl -X GET http://localhost:8000/api/users/disableduser/profile/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| III-1-11 | Public profile của `disableduser` (`is_active=False`) | `200 OK` hoặc `404` (tùy implementation — kiểm tra behavior) |

> **Lưu ý test III-1-11:** Theo `get_object_or_404(User.objects.select_related('profile'), username=username)` trong view — nếu user tồn tại trong DB (dù `is_active=False`) thì vẫn trả về `200`. Ghi lại behavior thực tế.

---

## PHẦN IV — Activity Feed API

### IV-1 · GET /api/users/me/activity/

```bash
curl -X GET http://localhost:8000/api/users/me/activity/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-1-1 | HTTP status | `200 OK` |
| IV-1-2 | Số lượng events | `6` (đúng với seed data: 3 lesson + 2 challenge + 1 quiz) |
| IV-1-3 | Thứ tự sắp xếp | Theo `timestamp` giảm dần (mới nhất ở đầu) |
| IV-1-4 | Sự kiện đầu tiên | `type="lesson_complete"`, `item_title="Broken Access Control"` (1 ngày trước) |
| IV-1-5 | Cấu trúc mỗi event | Có đủ: `type`, `timestamp`, `item_title`, `source_id` |
| IV-1-6 | Kiểm tra event loại `lesson_complete` | `type="lesson_complete"`, `source_id` = lesson ID, `item_title` khớp lesson.title |
| IV-1-7 | Kiểm tra event loại `challenge_solve` | `type="challenge_solve"`, `source_id` = challenge ID |
| IV-1-8 | Kiểm tra event loại `quiz_complete` | `type="quiz_complete"`, `source_id` = quiz ID |
| IV-1-9 | Giới hạn tối đa 30 events | Nếu seed thêm 30+ events, phải verify chỉ trả về 30 |

### IV-2 · GET /api/users/{username}/activity/ — Public, không cần auth

```bash
curl -X GET http://localhost:8000/api/users/member1/activity/
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-2-1 | HTTP status | `200 OK` |
| IV-2-2 | Số events | `6` (giống với `/me/activity/` của member1) |
| IV-2-3 | Cấu trúc events | Giống hệt — không có data thêm hay bớt so với authenticated version |
| IV-2-4 | Activity của member2 (không có events) | `200 OK`, array rỗng `[]` |
| IV-2-5 | Username không tồn tại | `404 Not Found` |

### IV-3 · Activity chỉ đếm completed items

```bash
# Tạo progress chưa complete và kiểm tra không xuất hiện trong feed
python manage.py shell -c "
from django.contrib.auth import get_user_model
from api.models import Lesson, UserLessonProgress
User = get_user_model()
member2 = User.objects.get(username='member2')
lesson = Lesson.objects.first()
# Tạo progress không có completed_at (is_completed là @property, không phải DB field)
UserLessonProgress.objects.get_or_create(
    user=member2, lesson=lesson,
    defaults={'started_at': None, 'completed_at': None}
)
print('Done')
"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| IV-3-1 | Sau khi tạo in-progress lesson — đếm lại activity feed | Số events không tăng (in-progress không xuất hiện) |

---

## PHẦN V — Admin User Management API

### V-1 · GET /api/admin/users/ — Liệt kê users

```bash
curl -X GET "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-1-1 | HTTP status | `200 OK` |
| V-1-2 | Cấu trúc response | Paginated: `count`, `next`, `previous`, `results` |
| V-1-3 | Số lượng users trong `results` | 6 (admin + editor1 + member1 + member2 + member3 + disableduser) |
| V-1-4 | Mỗi user có field `profile` nested | Profile object có `display_name`, `bio`, ... |
| V-1-5 | Mỗi user có field `roles` array | Array với `id`, `name`, `is_system` |
| V-1-6 | member1 có role `Member` | `roles=[{name:"Member",...}]` |
| V-1-7 | admin có role `Admin` | `roles=[{name:"Admin",...}]` |

### V-2 · GET /api/admin/users/ — Filters

```bash
# Filter is_active=false
curl -X GET "http://localhost:8000/api/admin/users/?is_active=false" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-2-1 | `?is_active=false` | Chỉ trả về `disableduser` (1 user) |
| V-2-2 | `?is_active=true` | Trả về 5 users active |
| V-2-3 | `?is_active=invalid` | `400 Bad Request` ("Use true or false.") |
| V-2-4 | `?date_joined_from=2026-04-14` | Chỉ users join từ hôm nay trở đi (tất cả users vừa seed) |
| V-2-5 | `?date_joined_from=2030-01-01` | Array rỗng (chưa có user nào join sau 2030) |
| V-2-6 | `?date_joined_from=INVALID-DATE` | `400 Bad Request` |
| V-2-7 | `?date_joined_from=2026-04-14&date_joined_to=2026-04-14` | Chỉ users join đúng hôm nay |

### V-3 · GET /api/admin/users/{id}/ — Chi tiết user

```bash
# Lấy ID của member1 từ kết quả V-1, thay vào {id}
curl -X GET "http://localhost:8000/api/admin/users/{member1_id}/" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-3-1 | HTTP status | `200 OK` |
| V-3-2 | Trường `username` | `"member1"` |
| V-3-3 | Trường `email` | `"member1@test.local"` |
| V-3-4 | Trường `is_active` | `true` |
| V-3-5 | Trường `profile.display_name` | `"Member One"` |
| V-3-6 | Trường `roles` | `[{name:"Member"}]` |
| V-3-7 | Trường `password` | **Không xuất hiện** (`write_only=True`) |
| V-3-8 | User ID không tồn tại | `404 Not Found` |

### V-4 · POST /api/admin/users/ — Tạo user mới

```bash
# Tạo user với password
curl -X POST "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser1",
    "email": "newuser1@test.local",
    "password": "SecurePass123!",
    "first_name": "New",
    "last_name": "User"
  }'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-4-1 | HTTP status | `201 Created` |
| V-4-2 | Response `username` | `"newuser1"` |
| V-4-3 | Response `is_active` | `true` (default) |
| V-4-4 | Response `roles` | `[{name:"Member"}]` (auto-assign Member khi không gửi `role_ids`) |
| V-4-5 | Response `profile` | Profile được tạo tự động (tất cả fields null/default) |
| V-4-6 | Tạo user không có password | `201 Created`, user có unusable password (SSO-only) |
| V-4-7 | Tạo user với `role_ids=[admin_role_id]` | `201 Created`, user có role Admin |
| V-4-8 | Tạo user không có email | `201 Created`, email = `""` |

```bash
# Tạo user không có password
curl -X POST "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"sso_only_user","email":"sso@test.local"}'
```

**Test validation:**

```bash
# Username trùng
curl -X POST "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"member1","email":"another@test.local"}'

# Email trùng
curl -X POST "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"brandnewuser","email":"member1@test.local"}'

# role_ids không tồn tại
curl -X POST "http://localhost:8000/api/admin/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testrole","role_ids":[9999]}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-4-9 | Username trùng | `400 Bad Request` với lỗi field `username` |
| V-4-10 | Email trùng | `400 Bad Request` với lỗi field `email` |
| V-4-11 | `role_ids` chứa ID không tồn tại | `400 Bad Request` với lỗi `role_ids: Role ids not found: [9999]` |
| V-4-12 | Password yếu (ví dụ `"123"`) | `400 Bad Request` (django password validators) |

### V-5 · PATCH /api/admin/users/{id}/ — Cập nhật user

```bash
# Deactivate member2
MEMBER2_ID=$(curl -s "http://localhost:8000/api/admin/users/?is_active=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -c "import sys,json; data=json.load(sys.stdin); print([u['id'] for u in data['results'] if u['username']=='member2'][0])")

curl -X PATCH "http://localhost:8000/api/admin/users/$MEMBER2_ID/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-5-1 | PATCH `is_active=false` | `200 OK`, response `is_active=false` |
| V-5-2 | Sau khi deactivate — verify database | `GET /api/admin/users/{id}/` trả về `is_active=false` |
| V-5-3 | Sessions bị revoke sau deactivate | `GET /api/auth/sessions/` với token của member2 → `401` (không còn session active) |
| V-5-4 | PATCH `is_active=true` (reactivate) | `200 OK`, response `is_active=true` |

```bash
# Thay đổi roles của member3 thành Editor
MEMBER3_ID=...
EDITOR_ROLE_ID=$(curl -s "http://localhost:8000/api/admin/roles/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -c "import sys,json; data=json.load(sys.stdin); print([r['id'] for r in data if r['name']=='Editor'][0])")

curl -X PATCH "http://localhost:8000/api/admin/users/$MEMBER3_ID/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role_ids\": [$EDITOR_ROLE_ID]}"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| V-5-5 | Thay đổi `role_ids` | `200 OK`, response `roles` cập nhật theo `role_ids` mới |
| V-5-6 | role_ids thay thế hoàn toàn | member3 không còn role Member (đã bị thay bằng Editor) |
| V-5-7 | `role_ids=[]` (xóa hết roles) | `200 OK`, `roles=[]` |
| V-5-8 | `permission_version` tăng sau role change | Kiểm tra DB: `user.permission_version` đã tăng |

---

## PHẦN VI — Session Management API

### VI-1 · GET /api/auth/sessions/

> **Chuẩn bị:** member1 phải đã đăng nhập (có current session) và 2 seed sessions từ bước 2.3.

```bash
curl -X GET http://localhost:8000/api/auth/sessions/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-1-1 | HTTP status | `200 OK` |
| VI-1-2 | Số sessions trả về | `3` (1 current từ đăng nhập + 2 seed) |
| VI-1-3 | Cấu trúc mỗi session | Có: `id`, `device_info`, `created_at`, `last_used_at`, `expires_at` |
| VI-1-4 | **Không có** `refresh_token_hash` | Trường hash không được trả về |
| VI-1-5 | Session của Safari iPhone | `device_info` chứa "Safari" hoặc "iPhone" |
| VI-1-6 | Session của Firefox Linux | `device_info` chứa "Firefox" hoặc "Linux" |
| VI-1-7 | Chỉ sessions chưa bị revoke | `revoked_at=null` cho tất cả sessions trả về |

### VI-2 · DELETE /api/auth/sessions/{id}/ — Revoke một session

```bash
# Lấy session ID của Safari iPhone
SESSION_IDS=$(curl -s http://localhost:8000/api/auth/sessions/ \
  -H "Authorization: Bearer $MEMBER1_TOKEN" | python -c "
import sys, json
data = json.load(sys.stdin)
for s in data:
    print(s['id'], s['device_info'][:40])
")
echo "$SESSION_IDS"

# Revoke session của Safari iPhone (thay {safari_session_id})
curl -X DELETE "http://localhost:8000/api/auth/sessions/{safari_session_id}/" \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-2-1 | HTTP status sau DELETE | `204 No Content` |
| VI-2-2 | Verify sau revoke | `GET /api/auth/sessions/` còn `2` sessions |
| VI-2-3 | Session đã bị revoke không còn trong list | Safari session không xuất hiện |
| VI-2-4 | DELETE session của người khác | `404 Not Found` |
| VI-2-5 | DELETE session không tồn tại | `404 Not Found` |
| VI-2-6 | DELETE session đã bị revoke rồi | `404 Not Found` (session đã bị soft-delete) |

### VI-3 · Revoke tất cả sessions khác (via FE logic — gọi lần lượt)

> Frontend gọi `DELETE /api/auth/sessions/{id}/` cho từng non-current session. Không có single API endpoint cho "revoke all others". (Server có `POST /api/auth/logout-all/` nhưng revoke ALL bao gồm current session — FE không dùng endpoint này cho "revoke others".)

```bash
# Revoke tất cả sessions còn lại (Firefox)
curl -X DELETE "http://localhost:8000/api/auth/sessions/{firefox_session_id}/" \
  -H "Authorization: Bearer $MEMBER1_TOKEN"
```

| # | Kiểm tra | Kết quả mong đợi |
|---|---------|-----------------|
| VI-3-1 | Sau khi revoke tất cả session khác | `GET /api/auth/sessions/` chỉ còn `1` (current session) |
| VI-3-2 | Current session vẫn hoạt động | Sau khi revoke all others, `GET /api/users/me/profile/` vẫn trả về `200` |

---

## PHẦN VII — Frontend: Public Profile (`/profile/[username]`)

> Đảm bảo đã đăng nhập hoặc không đăng nhập (public profile không cần auth).

### VII-1 · Tải trang và hiển thị profile

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VII-1-1 | Truy cập `/vi/profile/member1` | Trang tải thành công (HTTP 200) |
| VII-1-2 | Quan sát loading state | Skeleton placeholder hiển thị trước khi data load xong |
| VII-1-3 | Sau khi load — `display_name` | "Member One" hiển thị nổi bật |
| VII-1-4 | Sau khi load — `@username` | "@member1" hiển thị |
| VII-1-5 | Sau khi load — `bio` | "Security enthusiast" hiển thị |
| VII-1-6 | Sau khi load — `location` | "HCMC" hiển thị |
| VII-1-7 | Sau khi load — `entry_year` | "2024" hiển thị |

### VII-2 · Stats cards (6 chỉ số)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VII-2-1 | Card Learning Points | **150** |
| VII-2-2 | Card Challenge Points | **200** |
| VII-2-3 | Card Quiz Points | **80** |
| VII-2-4 | Card Courses Completed | **2** |
| VII-2-5 | Card Challenges Completed | **5** |
| VII-2-6 | Card Quizzes Completed | **3** |

### VII-3 · Activity Timeline (6 sự kiện từ seed)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VII-3-1 | Số events hiển thị | **6** |
| VII-3-2 | Sự kiện đầu tiên (mới nhất — 1 ngày trước) | "Broken Access Control", type lesson |
| VII-3-3 | Sự kiện thứ 2 (2 ngày trước) | "JWT Pwn", type challenge |
| VII-3-4 | Sự kiện thứ 5 (5 ngày trước) | "Injection Basics", type lesson |
| VII-3-5 | Sự kiện cuối (6 ngày trước) | "OWASP Basics Quiz", type quiz |
| VII-3-6 | Icon phân biệt loại | Lesson / Challenge / Quiz có icon khác nhau |
| VII-3-7 | Thời gian tương đối | "N ngày trước" (hoặc định dạng locale) |

### VII-4 · Edge cases

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VII-4-1 | Truy cập `/vi/profile/nonexistentuser` | Trang hiển thị 404 state ("Không tìm thấy người dùng") |
| VII-4-2 | Truy cập `/vi/profile/member2` (profile tối giản) | Trang tải thành công, `display_name` hiển thị null/fallback username |
| VII-4-3 | Truy cập `/en/profile/member1` | Trang tải thành công với labels tiếng Anh |

---

## PHẦN VIII — Frontend: Profile Settings (`/profile/settings`)

> Đăng nhập với `member1` trước khi test phần này.

### VIII-1 · Tải trang và pre-fill dữ liệu

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VIII-1-1 | Truy cập `/vi/profile/settings` | Trang tải thành công, không redirect |
| VIII-1-2 | Loading state | Skeleton/spinner hiển thị trong khi `GET /api/users/me/profile/` đang được gọi |
| VIII-1-3 | Sau khi load — ProfileEditForm | `display_name="Member One"` pre-filled |
| VIII-1-4 | Sau khi load — ProfileEditForm | `bio="Security enthusiast"` pre-filled |
| VIII-1-5 | Sau khi load — ProfileEditForm | `location="HCMC"` pre-filled |
| VIII-1-6 | Sau khi load — ProfileEditForm | `entry_year=2024` pre-filled |
| VIII-1-7 | Sau khi load — AppSettingsForm | Language select = "Tiếng Việt" (vi) |
| VIII-1-8 | Sau khi load — AppSettingsForm | Theme select = "Tối" (dark) |
| VIII-1-9 | Sau khi load — AppSettingsForm | Timezone = "Asia/Ho_Chi_Minh" |
| VIII-1-10 | Sau khi load — AccountForm | `username="member1"` pre-filled |
| VIII-1-11 | Network tab | `GET /api/users/me/profile/` gọi đến `localhost:8000` (không phải MSW) |

### VIII-2 · ProfileEditForm — Lưu thay đổi

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VIII-2-1 | Đổi `display_name` thành "FE Test Name", click Save | `PATCH /api/users/me/profile/` được gọi đến backend thật |
| VIII-2-2 | Loading state trong khi submit | Button disabled + loading indicator |
| VIII-2-3 | Sau khi save thành công | Thông báo thành công xuất hiện |
| VIII-2-4 | Reload trang | `display_name` vẫn là "FE Test Name" (đã persist vào DB) |
| VIII-2-5 | Verify bằng API | `GET /api/users/me/profile/` trả về `display_name="FE Test Name"` |
| VIII-2-6 | Xóa `bio`, click Save | Lưu thành công với bio rỗng |
| VIII-2-7 | Nhập `avatar_url` hợp lệ, click Save | Lưu thành công |

### VIII-3 · AppSettingsForm — Cài đặt ngôn ngữ/theme/timezone

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VIII-3-1 | Chọn "English", click Save | `PATCH /api/users/me/settings/` được gọi với `{"language":"en"}` |
| VIII-3-2 | Sau khi save | Thông báo thành công |
| VIII-3-3 | Verify API | `GET /api/users/me/profile/` trả về `language="en"` |
| VIII-3-4 | Chọn "Tối" (dark), click Save | Lưu `theme="dark"` thành công |
| VIII-3-5 | Đổi timezone về "UTC", click Save | Lưu `timezone="UTC"` thành công |

### VIII-4 · AccountForm — Đổi username/email

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VIII-4-1 | Quan sát nút Save khi chưa đổi gì | Nút Save **disabled** |
| VIII-4-2 | Đổi username thành "member1_fe", click Save | `PATCH /api/users/me/account/` gọi đến backend thật, lưu thành công |
| VIII-4-3 | Reload trang | Username trong AccountForm hiển thị "member1_fe" |
| VIII-4-4 | Thử đổi username thành "admin" (đã tồn tại) | Error message từ server xuất hiện trong form |
| VIII-4-5 | Khôi phục username về "member1" sau test | Đảm bảo không ảnh hưởng các test sau |

### VIII-5 · Session card & deferred sections

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| VIII-5-1 | Tìm card/link Session Management | Card hoặc link hiển thị trên trang settings |
| VIII-5-2 | Click vào link Session Management | Điều hướng đến `/vi/profile/sessions` |
| VIII-5-3 | Section "Đổi mật khẩu" | Hiển thị nhưng disabled/opacity (deferred Task 1.4) |
| VIII-5-4 | Section "SSO Identity" | Hiển thị nhưng disabled/opacity (deferred) |

---

## PHẦN IX — Frontend: Session Management (`/profile/sessions`)

> Đảm bảo member1 có ít nhất 3 sessions (1 current + 2 từ seed bước 2.3).

### IX-1 · Tải trang và hiển thị danh sách

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| IX-1-1 | Truy cập `/vi/profile/sessions` | Trang tải thành công |
| IX-1-2 | Network tab khi load | `GET /api/auth/sessions/` gọi đến `localhost:8000` |
| IX-1-3 | Skeleton rows trong khi loading | Hiển thị placeholder rows |
| IX-1-4 | Sau khi load — số sessions | **3** sessions (1 current + 2 seed) |
| IX-1-5 | Session hiện tại | Badge/indicator "Current" trên session có `last_used_at` mới nhất |
| IX-1-6 | Cột Device | Hiển thị `device_info` (user agent string) |
| IX-1-7 | Cột Created | Ngày tạo session |
| IX-1-8 | Cột Last Used | Thời gian sử dụng gần nhất |
| IX-1-9 | Cột Expires | Ngày hết hạn |
| IX-1-10 | Session hiện tại — nút Revoke | **Disabled** (không thể revoke current session) |
| IX-1-11 | Các session khác — nút Revoke | **Enabled** |

### IX-2 · Revoke một session

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| IX-2-1 | Click Revoke trên session Safari | Dialog xác nhận xuất hiện |
| IX-2-2 | Dialog — nội dung | Tên thiết bị/UA của session xuất hiện trong dialog |
| IX-2-3 | Click Cancel trong dialog | Dialog đóng, bảng không thay đổi |
| IX-2-4 | Click Revoke lại → Confirm | `DELETE /api/auth/sessions/{id}/` được gọi đến backend |
| IX-2-5 | Sau khi confirm | Dialog đóng, bảng cập nhật còn **2** sessions |
| IX-2-6 | Thông báo thành công | Banner/toast success hiển thị |
| IX-2-7 | Network tab | `DELETE` request thành công (204), `GET` refresh lại list |

### IX-3 · Revoke All Other Sessions

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| IX-3-1 | Nút "Revoke All Other" (khi còn 2 sessions) | Nút **enabled** |
| IX-3-2 | Click "Revoke All Other" | Dialog xác nhận xuất hiện |
| IX-3-3 | Click Confirm | Gọi `DELETE /api/auth/sessions/{id}/` cho từng session (2 requests DELETE song song) |
| IX-3-4 | Sau khi revoke all | Bảng chỉ còn **1** session (current) |
| IX-3-5 | Thông báo thành công | Banner/toast success |
| IX-3-6 | Nút "Revoke All Other" sau đó | **Disabled** (không còn session nào khác) |
| IX-3-7 | Network tab | 2 DELETE requests + 1 GET refresh |

### IX-4 · Trạng thái chỉ còn 1 session

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| IX-4-1 | Sau khi revoke all — bảng | 1 hàng duy nhất (current session) |
| IX-4-2 | Nút Revoke của current session | **Disabled** |
| IX-4-3 | Nút Revoke All Other | **Disabled** |

---

## PHẦN X — Frontend: Admin Users (`/admin/users`)

> Đăng nhập với `admin` (admin1234) trước khi test phần này.

### X-1 · Tải trang và bố cục

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| X-1-1 | Truy cập `/vi/admin/users` | Trang tải thành công (không redirect 403) |
| X-1-2 | Network tab | `GET /api/admin/users/` gọi đến `localhost:8000` |
| X-1-3 | Bảng users | Hiển thị 6 users từ seed (admin, editor1, member1, member2, member3, disableduser) |
| X-1-4 | Cột Username | Hiển thị đúng |
| X-1-5 | Cột Email | Hiển thị đúng |
| X-1-6 | Cột Role(s) | Hiển thị role của mỗi user |
| X-1-7 | Cột is_active / Status | `disableduser` có status inactive/disabled |
| X-1-8 | Pagination | Nếu > 20 users thì pagination hiển thị |

### X-2 · Search & Filter

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| X-2-1 | Nhập "member" vào search box | Hiển thị member1, member2, member3 (và disableduser nếu match) |
| X-2-2 | Nhập "admin" vào search box | Hiển thị admin |
| X-2-3 | Chọn filter "Active only" | Chỉ hiện 5 users active (không có disableduser) |
| X-2-4 | Chọn filter "Inactive only" | Chỉ hiện disableduser |
| X-2-5 | Chọn filter "All" | Hiện tất cả 6 users |

> **Lưu ý:** Kiểm tra xem filter status gọi `GET /api/admin/users/?is_active=true/false` hay lọc client-side. Quan sát Network tab để xác định.

### X-3 · Tạo user mới qua dialog

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| X-3-1 | Click button "Create User" / "Tạo người dùng" | Dialog mở |
| X-3-2 | Điền username="fetest1", email="fetest1@test.local", password="Test1234!" | Form hợp lệ |
| X-3-3 | Click Submit trong dialog | `POST /api/admin/users/` gọi đến backend |
| X-3-4 | Sau khi tạo thành công | Dialog đóng, bảng refresh, "fetest1" xuất hiện trong danh sách |
| X-3-5 | fetest1 có role | "Member" (auto-assign) |
| X-3-6 | Thử tạo user với username đã tồn tại ("member1") | Error message trong dialog |
| X-3-7 | Tạo user không có password | `201` thành công (password trường optional) |

### X-4 · Toggle active/inactive

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| X-4-1 | Click toggle/button disable của member2 | Dialog xác nhận xuất hiện (deactivation needs confirm) |
| X-4-2 | Confirm deactivation | `PATCH /api/admin/users/{id}/` với `is_active=false` gọi đến backend |
| X-4-3 | Sau khi deactivate | member2 hiển thị với status inactive trong bảng |
| X-4-4 | Verify backend | `GET /api/admin/users/{member2_id}/` trả về `is_active=false` |
| X-4-5 | Reactivate member2 | Click toggle lại, không cần confirm (activate không nguy hiểm) |
| X-4-6 | Sau reactivate | member2 trở lại active |

### X-5 · Link Manage Roles

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| X-5-1 | Click "Manage Roles" / icon role của member1 | Điều hướng đến `/vi/admin/rbac/users/{member1_id}/roles` |
| X-5-2 | Trang RBAC user roles | Tải thành công với danh sách roles của member1 |

---

## PHẦN XI — Cross-feature & End-to-End Flows

### XI-1 · Flow: Admin tạo user → User đăng nhập → User xem profile của mình

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XI-1-1 | Admin tạo user `e2euser` với password `E2ETest123!` via `POST /api/admin/users/` | `201 Created` |
| XI-1-2 | `e2euser` đăng nhập: `POST /api/auth/login/` | `200 OK`, nhận tokens |
| XI-1-3 | `GET /api/users/me/profile/` với e2euser token | `200 OK`, profile được tạo tự động |
| XI-1-4 | `e2euser` cập nhật profile | `PATCH /api/users/me/profile/` lưu thành công |
| XI-1-5 | `GET /api/users/e2euser/profile/` (public) | Trả về profile mới cập nhật |

### XI-2 · Flow: Admin deactivate user → User bị đăng xuất

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XI-2-1 | member1 đang đăng nhập, có active token | `GET /api/users/me/profile/` thành công |
| XI-2-2 | Admin `PATCH /api/admin/users/{member1_id}/` với `is_active=false` | `200 OK`, sessions bị revoke |
| XI-2-3 | member1 thử `GET /api/users/me/profile/` với token cũ | `401 Unauthorized` (session bị revoke, token invalid) |
| XI-2-4 | member1 thử đăng nhập lại | `401 Unauthorized` ("Invalid credentials." — user is_active=False) |
| XI-2-5 | Admin reactivate: `PATCH` với `is_active=true` | member1 có thể đăng nhập lại |

### XI-3 · Flow: Đổi role → Permission cache invalidated

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XI-3-1 | member3 đăng nhập, ghi nhớ token | `200 OK` |
| XI-3-2 | Admin thay đổi role member3 thành Admin | `PATCH /api/admin/users/{member3_id}/` với `role_ids=[admin_role_id]` |
| XI-3-3 | Kiểm tra DB `permission_version` của member3 | Đã tăng lên so với trước |
| XI-3-4 | member3 dùng token cũ gọi admin endpoint | Cần refresh token để lấy permissions mới |
| XI-3-5 | member3 refresh token: `POST /api/auth/token/refresh/` | Nhận token mới với permissions cập nhật |

### XI-4 · Flow: Session tracking — Đăng nhập nhiều thiết bị

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XI-4-1 | Login với member1 từ browser 1 (simulated) | Session 1 được tạo |
| XI-4-2 | Login với member1 từ browser 2 (simulated, device_info khác) | Session 2 được tạo |
| XI-4-3 | `GET /api/auth/sessions/` | Trả về ít nhất 2 sessions |
| XI-4-4 | Revoke session từ browser 2 | Session 2 bị xóa, browser 2 không còn access |
| XI-4-5 | Browser 1 vẫn hoạt động | `GET /api/users/me/profile/` với token browser 1 vẫn `200 OK` |

### XI-5 · Flow: Activity feed cập nhật khi hoàn thành bài học

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XI-5-1 | `GET /api/users/me/activity/` của member2 | `[]` (chưa có activity) |
| XI-5-2 | Tạo `UserLessonProgress` hoàn thành cho member2 (via shell/API) | Lưu với `completed_at` |
| XI-5-3 | `GET /api/users/me/activity/` của member2 | `[{type:"lesson_complete",...}]` |
| XI-5-4 | `GET /api/users/member2/activity/` (public) | Cùng kết quả |

---

## PHẦN XII — Edge Cases & Security

### XII-1 · Rate limiting và brute force

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-1-1 | Gọi `POST /api/auth/login/` với sai password 5 lần liên tiếp | `429 Too Many Requests` ở lần thứ 6 |
| XII-1-2 | Sau timeout, gọi lại với đúng password | Đăng nhập thành công |

### XII-2 · Token security

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-2-1 | Dùng expired access token | `401 Unauthorized` |
| XII-2-2 | Dùng revoked refresh token để refresh | `401 Unauthorized` |
| XII-2-3 | Dùng token của user bị deactivate | `401 Unauthorized` |

### XII-3 · Input validation — Profile update

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-3-1 | PATCH `display_name` > 100 ký tự | `400 Bad Request` |
| XII-3-2 | PATCH `bio` > 500 ký tự | `400 Bad Request` |
| XII-3-3 | PATCH `language="zh"` (không hợp lệ) | `400 Bad Request` |
| XII-3-4 | PATCH `theme="neon"` (không hợp lệ) | `400 Bad Request` |
| XII-3-5 | PATCH không gửi body gì | `400 Bad Request` hoặc `200 OK` không thay đổi gì |

### XII-4 · Admin endpoint boundary

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-4-1 | Admin không thể xóa user (DELETE /api/admin/users/{id}/) | `405 Method Not Allowed` (không có `destroy` mixin) |
| XII-4-2 | Admin PATCH với `is_staff=true` | `400` hoặc field bị ignore (`read_only_fields = ['is_staff', 'is_superuser']`) |
| XII-4-3 | Admin PATCH `role_ids` với duplicate IDs | `200 OK`, dedup tự động (role chỉ được gán 1 lần) |

### XII-5 · Profile auto-creation

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-5-1 | User vừa tạo chưa có profile, gọi `GET /api/users/me/profile/` | Profile tự động được tạo (`get_or_create`), trả về `200 OK` với defaults |
| XII-5-2 | Gọi `/api/users/{username}/profile/` cho user không có profile | Profile tự động được tạo, trả về `200 OK` |

### XII-6 · Concurrent deactivation

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| XII-6-1 | member1 có active request đang chạy (ví dụ long operation) | Sau khi admin deactivate, request tiếp theo của member1 trả về `401` |
| XII-6-2 | Session revocation là synchronous | Ngay khi PATCH `is_active=false` hoàn tất, session đã bị revoke (không delay) |

---

## Phụ lục A: Checklist tóm tắt (dạng bảng nhanh)

| # | Nhóm | Test case | Pass/Fail | Ghi chú |
|---|------|-----------|-----------|---------|
| I-1 | Auth | Unauthenticated → 401 | | |
| I-2 | Auth | Non-admin → admin endpoints → 403 | | |
| I-3 | Auth | Admin → admin endpoints → 200 | | |
| I-4 | Auth | Cross-user session isolation | | |
| II-1 | Profile | GET /me/profile/ returns full profile | | |
| II-2 | Profile | PATCH /me/profile/ updates & persists | | |
| II-3 | Settings | PATCH /me/settings/ updates language/theme/tz | | |
| II-4 | Account | PATCH /me/account/ username/email + uniqueness | | |
| III-1 | Public | GET /{username}/profile/ — no email exposed | | |
| III-1-10 | Public | 404 for non-existent username | | |
| IV-1 | Activity | GET /me/activity/ — sorted, 6 events | | |
| IV-2 | Activity | GET /{username}/activity/ — public, no auth | | |
| IV-3 | Activity | Only completed items in feed | | |
| V-1 | Admin | GET /admin/users/ paginated list | | |
| V-2 | Admin | Filters: is_active, date_joined_from/to | | |
| V-4 | Admin | POST create: auto-profile, auto-Member role | | |
| V-4-9 | Admin | Create duplicate username → 400 | | |
| V-5 | Admin | PATCH is_active=false → revoke sessions | | |
| V-5-5 | Admin | PATCH role_ids → replaces roles | | |
| VI-1 | Session | GET /sessions/ — no token hash | | |
| VI-2 | Session | DELETE /sessions/{id}/ → 204 | | |
| VI-2-4 | Session | Delete other user's session → 404 | | |
| VII | FE | Public profile page renders correctly | | |
| VIII | FE | Profile settings forms save to real backend | | |
| IX | FE | Session management revoke works | | |
| X | FE | Admin users CRUD works | | |
| XI-2 | E2E | Deactivate flow: user logged out | | |
| XII-3 | Security | Validation on profile fields | | |

---

## Phụ lục B: Lệnh reset nhanh giữa các lần test

```bash
# Reset toàn bộ về trạng thái ban đầu
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
# Sau đó chạy lại script seed từ mục 2.2 và 2.3
```

```bash
# Chỉ reset sessions của member1 (không mất user data)
python manage.py shell -c "
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import UserSession
User = get_user_model()
member1 = User.objects.get(username='member1')
revoked = UserSession.objects.filter(user=member1, revoked_at__isnull=True).update(revoked_at=timezone.now())
print(f'Revoked {revoked} sessions')
"
```

```bash
# Kiểm tra nhanh state hiện tại
python manage.py shell -c "
from django.contrib.auth import get_user_model
from api.models import UserSession, UserProfile
User = get_user_model()
print('--- Users ---')
for u in User.objects.all():
    sessions = UserSession.objects.filter(user=u, revoked_at__isnull=True).count()
    print(f'  {u.username} (active={u.is_active}, sessions={sessions})')
print('--- Profiles ---')
for p in UserProfile.objects.select_related('user').all():
    print(f'  {p.user.username}: display_name={p.display_name}, lang={p.language}')
"
```
