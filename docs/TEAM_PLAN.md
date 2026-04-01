# KẾ HOẠCH TRIỂN KHAI ILS v2 — NHÓM 2 NGƯỜI

> Tài liệu phân tích và lên kế hoạch phát triển song song cho nhóm 2 thành viên.
> Dựa trên: `AGENT.md`, `IMPL_PLAN.md`, `STATUS.md`, `REQUIREMENTS.md`, `DECISIONS.md`, `ARCHITECTURE.md`
>
> Cập nhật lần cuối: 2026-03-12

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Hiện trạng](#2-hiện-trạng)
3. [Phân tích phụ thuộc giữa các Slice](#3-phân-tích-phụ-thuộc-giữa-các-slice)
4. [Phân công vai trò](#4-phân-công-vai-trò)
5. [Câu hỏi cần giải quyết trước khi code](#5-câu-hỏi-cần-giải-quyết-trước-khi-code)
6. [Kế hoạch triển khai theo Phase](#6-kế-hoạch-triển-khai-theo-phase)
7. [Chi tiết phân công từng Phase](#7-chi-tiết-phân-công-từng-phase)
8. [Quy tắc phối hợp](#8-quy-tắc-phối-hợp)
9. [Rủi ro và giải pháp](#9-rủi-ro-và-giải-pháp)
10. [Checklist xác minh từng Slice](#10-checklist-xác-minh-từng-slice)

---

## 1. Tổng quan dự án

**ILS v2** là nền tảng học tập an ninh mạng tự host cho tổ chức nhỏ (~100 thành viên).

**Ba trụ cột học tập:**
- **Learn** — Khóa học có cấu trúc (markdown/video/mini-quiz), theo dõi tiến độ
- **Challenge** — Bài thử thách CTF, flag check server-side, tích hợp GitLab
- **Quiz** — Luyện tập realtime qua WebSocket (answer → check → next)

**Tech Stack:**

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind v4 + Zustand |
| Backend | Django 6 + DRF + SimpleJWT + Django Channels |
| Database | PostgreSQL (dev: SQLite) |
| Auth | JWT + bitmap permission + SSO via Authentik |

**Vai trò người dùng:** Admin (toàn quyền) · Editor (quản lý nội dung) · Member (tiêu thụ nội dung)

**Tích hợp bên ngoài:** Authentik (SSO) · Outline (nội dung bài học) · GitLab (nguồn challenge)

---

## 2. Hiện trạng

### Đã hoàn thành ✅

| Hạng mục | Chi tiết |
|----------|----------|
| Django project scaffold | Apps: `api`, `realtime` (active); `ai` (deferred) |
| Toàn bộ ORM models | ~1195 dòng trong `backend/api/models.py` — Challenge, Course, Quiz + tree nodes, flags, progress |
| Abstract base models | `CreateAudit`, `UpdateAudit`, `FullAudit`, `SoftDeleteAudit`, `BaseNode`, `BaseCategory`, `BaseTag` |
| Next.js scaffold | Default create-next-app; đã cài Zustand, next-intl, Axios |
| Tài liệu PRD | 10 PRD trong `docs/prd/` |
| Bộ tài liệu thiết kế | `ARCHITECTURE.md`, `DATA_MODEL.md`, `CONFIG.md`, `IMPL_PLAN.md`, v.v. |
| Settings | DRF + SimpleJWT + CORS + Channels config đã thêm |

### Chưa triển khai ❌

- **API views, serializers, URLs** — chưa có endpoint nào
- **Xác thực (Auth)** — chưa có login/register/JWT
- **Phân quyền (RBAC)** — chưa có permission check
- **Frontend pages** — chưa có trang nào ngoài default
- **Migrations** — chưa chạy (cần Custom User model trước)
- **12+ câu hỏi thiết kế mở** trong `DECISIONS.md` — đang chặn việc code

---

## 3. Phân tích phụ thuộc giữa các Slice

### Sơ đồ phụ thuộc

```
Slice 0 (Foundation: User model + migrations + seed_config)
  └── Slice 1 (Authentication: login, JWT, SSO)
        │
        ├── Slice 2 (RBAC: permissions, roles, JWT claims)
        │     └── [BẮT BUỘC hoàn thành trước deploy production]
        │
        ├── Slice 3 (System Config CRUD)           ← song song với S2 (authZ bypass)
        │
        ├── Slice 4 (Frontend Foundation)           ← song song với S2 (authZ bypass)
        │     ├── Slice 5 (Learn)                   ← cần S4 hoàn thành
        │     ├── Slice 6 (Challenge)               ← cần S4 hoàn thành
        │     ├── Slice 7 (Quiz)                    ← cần S4 hoàn thành
        │     └── Slice 8 (User Profile)            ← cần S4 hoàn thành
        │
        ├── Slice 9  (Notifications)                ← cần signals từ S5+S6+S7
        └── Slice 11 (Statistics)                   ← cần data từ S5+S6+S7
```

### Nguyên tắc phát triển song song

> **AuthZ Bypass:** Đặt `auth.authorization_enabled=false` trong `system_config` cho phép bỏ qua
> kiểm tra RBAC. Nhờ đó, các Slice 3–9, 11 có thể phát triển **song song với Slice 2**
> khi Slice 0 + Slice 1 đã hoàn thành.

### Thứ tự ưu tiên trong mỗi Slice

1. **Backend API (chức năng)** — CRUD, business logic, signals
2. **Backend API (phi chức năng)** — rate limiting, caching, logging (chỉ khi cần)
3. **Frontend (chức năng)** — UI cơ bản, forms, hiển thị dữ liệu
4. **Frontend (phi chức năng)** — i18n, theming, animation (chỉ khi cần)

### Khối lượng ước tính mỗi Slice

| Slice | Backend (sessions) | Frontend (sessions) | Tổng | Độ phức tạp |
|-------|-------------------|--------------------:|-----:|-------------|
| 0 — Foundation | 1 | 0 | 1 | Thấp |
| 1 — Authentication | 3–4 | 1 | 4–5 | Cao |
| 2 — RBAC | 3 | 1 | 4 | Cao |
| 3 — System Config | 1 | 1 | 2 | Thấp |
| 4 — Frontend Foundation | 0 | 2–3 | 2–3 | Trung bình |
| 5 — Learn | 3–4 | 2–3 | 5–7 | Cao |
| 6 — Challenge | 3–4 | 2 | 5–6 | Cao |
| 7 — Quiz (WebSocket) | 3–4 | 2 | 5–6 | Rất cao |
| 8 — User Profile | 1–2 | 1–2 | 2–4 | Trung bình |
| 9 — Notifications | 2 | 1 | 3 | Trung bình |
| 11 — Statistics | 1–2 | 1 | 2–3 | Thấp |
| **Tổng** | **~21–28** | **~14–19** | **~35–47** | |

> 1 session ≈ 2–4 giờ làm việc tập trung

---

## 4. Phân công vai trò

### Chiến lược phân công

Dựa trên kiến trúc **Backend (Django) + Frontend (Next.js)**, phân công theo **chuyên môn chính + hỗ trợ chéo**:

| | **Người A — Backend Lead** | **Người B — Frontend Lead** |
|--|---------------------------|----------------------------|
| **Chính** | Django API, models, services, signals, WebSocket consumers | Next.js pages, components, stores, Axios/WebSocket client |
| **Phụ** | Review frontend logic, hỗ trợ data flow | Backend đơn giản (CRUD API nhẹ), review API design |
| **Chung** | Giải quyết open questions, thiết kế API contract, testing |

### Tại sao phân theo Backend/Frontend?

1. **Giảm conflict Git** — hai người làm ở hai thư mục khác nhau (`backend/` vs `frontend/`)
2. **Pipeline tự nhiên** — Backend API phải hoàn thành trước Frontend có thể gọi
3. **Chuyên sâu hơn** — mỗi người chỉ cần hiểu sâu một stack thay vì cả hai
4. **Tận dụng authZ bypass** — Backend có thể chạy trước, Frontend theo sau

---

## 5. Câu hỏi cần giải quyết trước khi code

> ⚠️ **QUAN TRỌNG:** Các câu hỏi này PHẢI được cả 2 người thống nhất trước khi bắt đầu code.
> Chi tiết và lựa chọn trong `docs/DECISIONS.md`.

### Nhóm chặn Slice 0 (giải quyết đầu tiên)

| ID | Vấn đề | Gợi ý lựa chọn |
|----|--------|-----------------|
| Q-AUTH-02 | Cách tạo tài khoản Admin đầu tiên | **Gợi ý Option B:** Tạo management command `seed_admin` — đơn giản, lặp lại được |

### Nhóm chặn Slice 1 (giải quyết trước Phase 1)

| ID | Vấn đề | Gợi ý lựa chọn |
|----|--------|-----------------|
| Q-INFRA-02 | Quy tắc URL prefix (`/api/courses/` hay `/api/learn/courses/`) | **ĐÃ CHỐT:** Namespaced URLs (`/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`) |
| Q-INFRA-03 | Email backend cho reset password | **Gợi ý Option C:** Hoãn password reset — tập trung login/register trước |
| Q-INFRA-04 | Cache backend cho rate limiting | **Gợi ý Option A:** LocMemCache cho dev — chuyển Redis khi cần production |
| Q-INFRA-06 | Lưu token ở client | **Gợi ý Option A:** `localStorage` — đơn giản, phù hợp internal platform ~100 người |
| Q-AUTH-01 | Role mặc định cho user mới đăng ký | **Gợi ý Option B:** Tự động gán role "Member" — UX mượt |
| Q-AUTH-03 | Fallback khi SSO sập | **Gợi ý Option C:** Luôn cho phép superuser local login — an toàn, scope nhỏ |

### Nhóm chặn Slice 4+ (giải quyết trước Phase 2)

| ID | Vấn đề | Gợi ý lựa chọn |
|----|--------|-----------------|
| Q-INFRA-01 | Thư mục frontend `src/` | **ĐÃ CHỐT:** Giữ `frontend/app/` (không dùng `src/`) |
| Q-INFRA-07 | Chiến lược i18n | **ĐÃ CHỐT:** Vietnamese-first, i18n từ Slice 4 |
| Q-INFRA-08 | UI component library | **Gợi ý Option A:** `shadcn/ui` — tương thích Tailwind v4, có sẵn components |
| Q-INFRA-05 | JWT auth cho WebSocket | **ĐÃ CHỐT:** Option B — first auth message, không truyền JWT qua query string |

### Nhóm chặn Slice 5 (giải quyết khi bắt đầu Phase 3)

| ID | Vấn đề | Gợi ý lựa chọn |
|----|--------|-----------------|
| Q-LEARN-01 | Tạo lesson node: 1 bước hay 2 bước | **ĐÃ CHỐT:** Atomic 1 bước |
| Q-LEARN-02 | Nguồn câu hỏi mini-quiz | **ĐÃ CHỐT:** Dùng chung `quiz_question` |
| Q-LEARN-03 | Progress khi thay đổi cấu trúc course | **ĐÃ CHỐT:** Versioned lazy recompute theo từng user-course |
| Q-LEARN-04 | Xóa course: soft-delete hay archive | **ĐÃ CHỐT:** Hybrid archive + soft-delete/purge |
| Q-LEARN-05 | Xung đột slug | **ĐÃ CHỐT:** Manual slug + server suggestions khi conflict |
| Q-LEARN-06 | Outline URL cho frontend | **ĐÃ CHỐT:** Backend-mediated Outline; FE không gọi Outline trực tiếp |
| Q-LEARN-07 | Ai được tạo tag | **ĐÃ CHỐT:** Permission-based (không hardcode theo role) |
| Q-LEARN-08 | Trigger hoàn thành bài học | **ĐÃ CHỐT:** Hybrid |
| Q-LEARN-09 | Trigger bắt đầu bài học | **ĐÃ CHỐT:** Explicit |
| Q-LEARN-10 | Outline sync thất bại | **ĐÃ CHỐT:** Async queue |
| Q-CHALL-01 | Instance scope trong MVP | **Gợi ý:** Triển khai cơ bản, interface sẵn sàng cho mở rộng |

---

## 6. Kế hoạch triển khai theo Phase

### Tổng quan Gantt

```
                    Phase 0    Phase 1     Phase 2         Phase 3            Phase 4        Phase 5
                    ───────    ────────    ─────────       ────────           ────────       ────────
Người A (Backend):  [  S0  ]   [ S1-BE ]   [  S2-BE  ]    [ S5-BE | S6-BE ]  [S7-BE|S8-BE]  [S9|S11]
                                                           
Người B (Frontend): [Q & A ]   [ S3-BE ]   [S4|S1-FE]     [ S5-FE | S6-FE ]  [S7-FE|S8-FE]  [S9|S11]
                               [review ]   [S3-FE   ]
                    
Timeline ước tính:  ~1 ngày    ~5 ngày     ~5 ngày         ~10 ngày           ~7 ngày        ~4 ngày
```

**Tổng thời gian ước tính:** ~32 ngày làm việc (có thể thay đổi tùy kinh nghiệm và thời gian rảnh)

### Sơ đồ Phase chi tiết

```
╔═════════════════════════════════════════════════════════════════════════════╗
║ PHASE 0: NỀN TẢNG                                                           ║
║ ┌─────────────────────────────────────────────┐                             ║
║ │ Cả 2: Giải quyết câu hỏi S0, S1             │                             ║
║ │ A: Slice 0 (User model + migrations + seed) │                             ║
║ │ B: Review + chuẩn bị env                    │                             ║
║ └──────────────────┬──────────────────────────┘                             ║
╚════════════════════╪════════════════════════════════════════════════════════╝
                     │
╔════════════════════╪════════════════════════════════════════════════════════╗
║ PHASE 1: XÁC THỰC  │                                                        ║
║   ┌────────────────┴──────────────┐  ┌────────────────────────────┐         ║
║   │ A: Slice 1 Backend            │  │ B: Slice 3 Backend         │         ║
║   │   • auth_app setup            │  │   • System Config API      │         ║
║   │   • login / register / logout │  │   • GET/PATCH endpoints    │         ║
║   │   • JWT + token refresh       │  │   • Secrets masking        │         ║
║   │   • SSO / Authentik OIDC      │  │   + Review S1 API design   │         ║
║   │   • Password change           │  │                            │         ║
║   │   • Session management        │  │                            │         ║
║   └────────────────┬──────────────┘  └─────────────┬──────────────┘         ║
╚════════════════════╪═══════════════════════════════╪════════════════════════╝
                     │                               │
╔════════════════════╪═══════════════════════════════╪════════════════════════╗
║ PHASE 2: RBAC + FRONTEND FOUNDATION                │                        ║
║   ┌────────────────┴──────────────┐  ┌─────────────┴──────────────┐         ║
║   │ A: Slice 2 Backend (RBAC)     │  │ B: Slice 4 Frontend Found. │         ║
║   │   • Permission auto-discovery │  │   • App directory structure│         ║
║   │   • Role/Permission CRUD API  │  │   • Axios instance + auth  │         ║
║   │   • Permission cache + JWT    │  │   • Zustand auth store     │         ║
║   │   • HasJWTPermission class    │  │   • Shared Tree component  │         ║
║   │                               │  │   • Slice 1 Frontend       │         ║
║   │                               │  │     (Login/Register UI)    │         ║
║   │                               │  │   • Slice 3 Frontend       │         ║
║   │                               │  │     (Config admin UI)      │         ║
║   └────────────────┬──────────────┘  └─────────────┬──────────────┘         ║
╚════════════════════╪═══════════════════════════════╪════════════════════════╝
                     │                               │
╔════════════════════╪═══════════════════════════════╪════════════════════════╗
║ PHASE 3: FEATURE — LEARN + CHALLENGE               │                        ║
║   ┌────────────────┴──────────────┐  ┌─────────────┴──────────────┐         ║
║   │ A: Slice 5 Backend (Learn)    │  │ B: Slice 5 Frontend (Learn)│         ║
║   │   • Course + Category CRUD    │  │   • Course catalog + tree  │         ║
║   │   • CourseNode tree API       │  │   • Lesson viewer          │         ║
║   │   • Lesson CRUD + Outline     │  │   (bắt đầu khi A xong      │         ║
║   │   • Progress tracking signals │  │    S5 backend API)         │         ║
║   ├───────────────────────────────┤  ├────────────────────────────┤         ║
║   │ A: Slice 6 Backend (Challenge)│  │ B: Slice 6 Frontend (Chall)│         ║
║   │   • Challenge CRUD API        │  │   • Challenge browser      │         ║
║   │   • ChallengeNode + Flag CRUD │  │   • Flag submit form       │         ║
║   │   • Flag submission + progress│  │   (bắt đầu khi A xong      │         ║
║   │   • GitLab sync               │  │    S6 backend API)         │         ║
║   └────────────────┬──────────────┘  └─────────────┬──────────────┘         ║
╚════════════════════╪═══════════════════════════════╪════════════════════════╝
                     │                               │
╔════════════════════╪═══════════════════════════════╪════════════════════════╗
║ PHASE 4: FEATURE — QUIZ + USER PROFILE             │                        ║
║   ┌────────────────┴──────────────┐  ┌─────────────┴──────────────┐         ║
║   │ A: Slice 7 Backend (Quiz)     │  │ B: Slice 7 Frontend (Quiz) │         ║
║   │   • Quiz + Question CRUD      │  │   • Quiz browser + tree    │         ║
║   │   • QuizNode tree API         │  │   • WebSocket quiz session │         ║
║   │   • WS consumer (Channels)    │  │   (bắt đầu khi A xong      │         ║
║   │   • Progress signals          │  │    S7 backend + WS)        │         ║
║   ├───────────────────────────────┤  ├────────────────────────────┤         ║
║   │ A: Slice 8 Backend (Profile)  │  │ B: Slice 8 Frontend        │         ║
║   │   • User profile API          │  │   • Profile page + settings│         ║
║   │   • Admin user management     │  │   • Admin user management  │         ║
║   └────────────────┬──────────────┘  └─────────────┬──────────────┘         ║
╚════════════════════╪═══════════════════════════════╪════════════════════════╝
                     │                               │
╔════════════════════╪═══════════════════════════════╪════════════════════════╗
║ PHASE 5: NOTIFICATIONS + STATISTICS + PRODUCTION   │                        ║
║   ┌────────────────┴──────────────┐  ┌─────────────┴──────────────┐         ║
║   │ A: Slice 9 Backend            │  │ B: Slice 9 Frontend        │         ║
║   │   • Notification API          │  │   • Notification bell      │         ║
║   │   • Auto-trigger signals      │  │   • WS notification sub    │         ║
║   │   • WS notification delivery  │  │                            │         ║
║   ├───────────────────────────────┤  ├────────────────────────────┤         ║
║   │ A: Slice 11 Backend           │  │ B: Slice 11 Frontend       │         ║
║   │   • Leaderboard API           │  │   • Leaderboard page       │         ║
║   │   • Admin stats API           │  │   • Admin stats dashboard  │         ║
║   ├───────────────────────────────┤  ├────────────────────────────┤         ║
║   │ A: Bật RBAC (auth.authori-    │  │ B: RBAC Frontend           │         ║
║   │    zation_enabled=true)       │  │   • Admin RBAC UI (S2 FE)  │         ║
║   │   • Integration test          │  │   • Permission-aware render│         ║
║   └───────────────────────────────┘  └────────────────────────────┘         ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

---

## 7. Chi tiết phân công từng Phase

### Phase 0 — Nền tảng (~1 ngày)

**Mục tiêu:** Chạy được `migrate` + `seed_config` thành công.

| Người | Công việc | File chính | Kết quả |
|-------|-----------|------------|---------|
| **Cả 2** | Thống nhất câu hỏi Q-AUTH-02 (tạo admin) | `docs/DECISIONS.md` | Đánh dấu RESOLVED |
| **A** | Task 0.2: Custom User model + migrations | `api/models.py`, `settings.py` | `migrate` chạy sạch |
| **A** | Task 0.3: SystemConfig + `seed_config` + `get_config()` | `api/management/`, `api/utils.py` | `seed_config` tạo đủ key |
| **B** | Setup dev environment, review models.py | — | Hiểu rõ data model |
| **B** | Chuẩn bị `frontend/src/` structure (nếu chọn Option B cho Q-INFRA-01) | `frontend/` | Thư mục sẵn sàng |

**Gate:** `python manage.py migrate` + `python manage.py seed_config` chạy không lỗi.

---

### Phase 1 — Xác thực (~5 ngày)

**Mục tiêu:** Login/register hoạt động, JWT token được phát, Slice 3 backend xong.

**Trước Phase này:** Cả 2 phải thống nhất Q-INFRA-02 (URL prefix), Q-AUTH-01 (default role), Q-INFRA-04 (cache), Q-INFRA-06 (token storage).

| Người | Công việc | File chính | Kết quả |
|-------|-----------|------------|---------|
| **A** | Task 1.1: auth_app + native login/register/logout | `auth_app/views.py`, `serializers.py`, `urls.py` | POST login/register trả JWT |
| **A** | Task 1.2: JWT permission claims + token refresh | `auth_app/services/token_service.py` | Token refresh hoạt động |
| **A** | Task 1.3: SSO / Authentik OIDC | `auth_app/services/sso_service.py` | SSO redirect + callback |
| **A** | Task 1.4: Password change + session management | `auth_app/views.py` | Session list/revoke hoạt động |
| **B** | Task 3.1: System Config API (GET/PATCH) | `api/views/system_config.py`, `serializers/` | Config CRUD hoạt động, secrets masked |
| **B** | Review + test Slice 1 API (dùng Postman/curl) | — | Xác nhận API contract |
| **B** | Thống nhất API contract cho Phase 2–3 với A | — | Tài liệu TypeScript interface |

**Điểm phối hợp quan trọng:**
- A hoàn thành Task 1.1 → B test ngay → phản hồi trước khi A làm tiếp
- B xong Slice 3 backend → chuyển sang chuẩn bị API contract cho frontend

**Gate:** Login → nhận JWT → refresh thành công; Config API trả kết quả đúng.

---

### Phase 2 — RBAC + Frontend Foundation (~5 ngày)

**Mục tiêu:** RBAC backend hoàn thành, Frontend foundation sẵn sàng cho các feature slice.

**Trước Phase này:** Thống nhất Q-INFRA-01 (src/), Q-INFRA-08 (UI lib).

| Người | Công việc | File chính | Kết quả |
|-------|-----------|------------|---------|
| **A** | Task 2.1: Permission auto-discovery at startup | `auth_app/services/permission_discovery.py` | Permissions tự tạo khi khởi động |
| **A** | Task 2.2: Role/Permission CRUD API | `api/views/rbac.py` | Admin CRUD roles + assign permissions |
| **A** | Task 2.3: Permission cache + JWT encoding (bitmap) | `auth_app/services/permission_service.py` | Login → JWT chứa encoded permissions |
| **B** | Task 4.1: App structure + Axios + auth interceptor | `frontend/src/lib/api.ts` | Auto-refresh token on 401 |
| **B** | Task 4.1: Zustand auth store | `frontend/src/store/authStore.ts` | State management cho auth |
| **B** | Task 4.1: Shared Tree component | `frontend/src/components/Tree/` | Component tái sử dụng 3 domain |
| **B** | Task 1.5: Login/Register UI | `frontend/src/app/(auth)/` | Giao diện login/register hoạt động |
| **B** | Task 3.2: System Config Admin UI | `frontend/src/app/admin/config/` | Admin quản lý config |

**Điểm phối hợp quan trọng:**
- B cần A hoàn thành Slice 1 API contract (đã có từ Phase 1)
- A document API response format chi tiết để B build frontend
- B test Login UI ngay khi hoàn thành → phản hồi cho A về API issues

**Gate:** Login UI → API → JWT chứa permissions; Tree component render; Config UI CRUD.

---

### Phase 3 — Learn + Challenge (~10 ngày)

**Mục tiêu:** 2 feature chính (Learn + Challenge) hoạt động end-to-end.

**Trước Phase này:** Q-LEARN-* đã chốt; chỉ còn Q-CHALL-01 cần xác nhận phạm vi MVP cuối cùng.

**Cách phối hợp trong Phase này:**
- A làm backend trước → B làm frontend sau
- Nhưng A sẽ **làm xong S5 backend → chuyển sang S6 backend** — trong lúc đó B bắt đầu S5 frontend
- Pipeline chồng chéo tối ưu thời gian chờ

```
Thời gian →
A: [===== S5 Backend =====][===== S6 Backend =====]
B:          [wait...][===== S5 Frontend =====][===== S6 Frontend =====]
```

| Người | Công việc | File chính |
|-------|-----------|------------|
| **A** | Task 5.1: Course + Category CRUD API | `api/views/course.py` |
| **A** | Task 5.2: CourseNode tree API | `api/views/course.py` |
| **A** | Task 5.3: Lesson CRUD + Outline sync | `api/views/lesson.py` |
| **A** | Task 5.4: User progress tracking signals | `api/signals.py` |
| **A** | Task 6.1: Challenge CRUD API | `api/views/challenge.py` |
| **A** | Task 6.2: ChallengeNode + Flag CRUD | `api/views/challenge.py` |
| **A** | Task 6.3: Flag submission + progress | `api/services/flag_service.py` |
| **A** | Task 6.4: GitLab sync | `api/views/challenge.py` |
| **B** | Task 5.5: Course catalog + tree (bắt đầu khi A xong S5 BE) | `app/(app)/learn/` |
| **B** | Task 5.6: Lesson viewer | `app/(app)/learn/[slug]/[lessonId]/` |
| **B** | Task 6.5: Challenge browser + tree (bắt đầu khi A xong S6 BE) | `app/(app)/challenge/` |
| **B** | Task 6.6: Challenge detail + flag submit | `app/(app)/challenge/[slug]/` |

**Gate:** Tạo course → thêm node → tạo lesson → complete → progress cập nhật; Submit flag đúng → solved.

---

### Phase 4 — Quiz + User Profile (~7 ngày)

**Mục tiêu:** Quiz WebSocket session hoạt động, User Profile CRUD.

| Người | Công việc | File chính |
|-------|-----------|------------|
| **A** | Task 7.1: Quiz + Question CRUD API | `api/views/quiz.py` |
| **A** | Task 7.2: QuizNode tree API | `api/views/quiz.py` |
| **A** | Task 7.3: Django Channels WebSocket consumer | `realtime/consumers/quiz_consumer.py` |
| **A** | Task 7.4: Quiz progress signals | `api/signals.py` |
| **A** | Task 8.1: User profile API | `api/views/user.py` |
| **A** | Task 8.2: Admin user management API | `api/views/admin_user.py` |
| **B** | Task 7.5: Quiz browser (bắt đầu khi A xong S7 BE) | `app/(app)/quiz/` |
| **B** | Task 7.6: WebSocket quiz session | `app/(app)/quiz/[id]/session/` |
| **B** | Task 8.3: Profile page + settings | `app/(app)/profile/` |
| **B** | Task 8.4: Admin user management UI | `app/admin/users/` |

**⚠️ Lưu ý đặc biệt cho Slice 7:**
- WebSocket là phần phức tạp nhất — A và B cần **pair-programming** cho phần kết nối WS
- A triển khai consumer, B triển khai client → cần test cùng lúc
- A nên làm xong WS consumer protocol trước, document message format → B implement client

**Gate:** WS connect → trả lời câu hỏi → điểm cập nhật; Profile hiển thị đúng stats.

---

### Phase 5 — Hoàn thiện + Production (~4 ngày)

**Mục tiêu:** Notification + Statistics + RBAC production-ready.

| Người | Công việc | File chính |
|-------|-----------|------------|
| **A** | Task 9.1–9.3: Notification API + signals + WS delivery | `api/views/notification.py`, `realtime/consumers/` |
| **A** | Task 11.1–11.2: Leaderboard + Admin stats API | `api/views/stats.py` |
| **A** | Bật `auth.authorization_enabled=true` + integration test | `settings.py`, tests |
| **B** | Task 9.4: Notification bell + inbox | `components/NotificationBell.tsx` |
| **B** | Task 11.3–11.4: Leaderboard + Admin stats pages | `app/(app)/leaderboard/`, `app/admin/stats/` |
| **B** | Task 2.4: Admin RBAC UI | `app/admin/rbac/` |
| **B** | Permission-aware rendering (ẩn UI theo quyền) | Tất cả pages |

**Gate:** Notification realtime dưới 2s; Leaderboard sắp xếp đúng; RBAC chặn đúng permission.

---

## 8. Quy tắc phối hợp

### 8.1. Git Workflow

```
main
  └── develop
        ├── feature/slice-0-foundation        (A)
        ├── feature/slice-1-auth-backend       (A)
        ├── feature/slice-3-config-backend     (B)
        ├── feature/slice-2-rbac               (A)
        ├── feature/slice-4-frontend-foundation (B)
        ├── feature/slice-5-learn-backend      (A)
        ├── feature/slice-5-learn-frontend     (B)
        └── ...
```

**Quy tắc:**
1. Mỗi slice (hoặc nửa slice) = 1 branch
2. Tách rõ branch backend vs frontend khi cùng slice
3. **Merge vào `develop`** khi xong 1 slice/nửa slice — không giữ branch dài
4. Người kia **review** trước khi merge (tối thiểu đọc qua changes)
5. Chạy `make test-backend` trước khi mở PR

### 8.2. API Contract

> Đây là điểm phối hợp **quan trọng nhất** giữa 2 người.

**Quy trình thống nhất API:**
1. **A (backend)** viết API endpoint + request/response schema trước khi code
2. **B (frontend)** review schema → phản hồi nếu thiếu field hoặc format không phù hợp
3. Cả 2 **thống nhất** → A code backend, B code frontend dựa trên contract
4. Nếu cần đổi contract → cả 2 phải đồng ý + cập nhật tài liệu

**Format contract:**
```
POST /api/auth/login/
Request:  { username: string, password: string }
Response: { access: string, refresh: string, user: { id: number, username: string, email: string } }
Error:    { detail: string }  (401, 403, 429)
```

### 8.3. Giao tiếp hàng ngày

| Thời điểm | Nội dung |
|-----------|----------|
| **Đầu ngày** | Sync 5 phút: hôm qua xong gì, hôm nay làm gì, có blocker không |
| **Khi xong backend API** | A thông báo B: "API X sẵn sàng, đây là format response" |
| **Khi gặp blocker** | Hỏi ngay, không chờ — chuyển sang task khác nếu bị chặn |
| **Cuối ngày** | Push code, cập nhật `STATUS.md` nếu có tiến triển |

### 8.4. File ownership (tránh conflict)

| Thư mục / File | Chủ sở hữu chính | Người khác có thể sửa? |
|----------------|-------------------|------------------------|
| `backend/api/models.py` | A | Không — thông qua A |
| `backend/auth_app/` | A | Không |
| `backend/api/views/` | A | B có thể review |
| `backend/api/serializers/` | A | B có thể review |
| `backend/realtime/` | A | Không |
| `frontend/src/app/` | B | A có thể review |
| `frontend/src/components/` | B | A có thể review |
| `frontend/src/store/` | B | A có thể review |
| `frontend/src/lib/` | B | A có thể review |
| `docs/*.md` | Cả 2 | Cả 2 (thống nhất trước khi sửa) |
| `backend/backend/settings.py` | A | B hỏi trước |
| `backend/backend/urls.py` | A | B hỏi trước |

---

## 9. Rủi ro và giải pháp

| # | Rủi ro | Xác suất | Tác động | Giải pháp |
|---|--------|----------|----------|-----------|
| R1 | Câu hỏi mở không được giải quyết kịp → chặn code | Cao | Cao | Dành Phase 0 riêng cho việc này; chọn "gợi ý" ở mục 5 nếu không quyết định được |
| R2 | API contract không đồng bộ → frontend gọi sai | Trung bình | Cao | Viết contract trước, review chéo, dùng TypeScript interface |
| R3 | WebSocket (Quiz) phức tạp hơn dự kiến | Cao | Trung bình | Pair-programming cho phần WS; tách CRUD khỏi WS logic |
| R4 | Git conflict ở models.py | Thấp | Thấp | Chỉ A sửa models.py; B không chạm |
| R5 | SSO/Authentik không test được (cần server thật) | Trung bình | Thấp | Mock SSO trong dev; test thật khi deploy |
| R6 | B chờ A xong backend → lãng phí thời gian | Trung bình | Trung bình | B làm frontend khác (UI components, mock data) trong lúc chờ |
| R7 | Outline/GitLab integration phức tạp | Trung bình | Trung bình | Triển khai interface trước, mock response, tích hợp thật sau |

### Giải pháp cho R6 (B chờ A):

Khi B phải chờ A xong backend API, B có thể làm:
1. **Mock data** — viết frontend với dữ liệu giả, đổi sang API thật sau
2. **UI components** — xây dựng thêm shared components cho slices sau
3. **Testing** — viết test cho features đã xong
4. **Documentation** — cập nhật tài liệu, viết user guide
5. **Review code** của A

---

## 10. Checklist xác minh từng Slice

### Slice 0 ✓
- [ ] `python manage.py migrate` chạy không lỗi
- [ ] `python manage.py seed_config` tạo đủ config keys
- [ ] `get_config('auth.authorization_enabled')` trả `True`
- [ ] User model có: username, email, password (nullable), is_active, permission_version

### Slice 1 ✓
- [ ] `POST /api/auth/register/` → tạo user + trả JWT
- [ ] `POST /api/auth/login/` → authenticate + trả JWT
- [ ] `POST /api/auth/logout/` → revoke session
- [ ] `POST /api/auth/token/refresh/` → trả access token mới
- [ ] JWT payload chứa: user_id, username, permissions (rỗng ở Slice 1)
- [ ] SSO: redirect → callback → tạo user + trả JWT
- [ ] UserSession lưu refresh_token_hash (không lưu raw token)

### Slice 2 ✓
- [ ] Khởi động Django → permissions tự tạo từ URL scan
- [ ] `@add_role_granted` → built-in roles + role_permission đồng bộ
- [ ] Login → JWT chứa encoded permissions (base64 bitmap)
- [ ] `HasJWTPermission` chặn đúng khi `auth.authorization_enabled=true`
- [ ] `HasJWTPermission` cho qua khi `auth.authorization_enabled=false`
- [ ] Admin CRUD custom roles hoạt động

### Slice 3 ✓
- [ ] `GET /api/admin/config/` → danh sách config grouped by category
- [ ] Secret values hiển thị `"***"`
- [ ] `PATCH /api/admin/config/{key}/` → cập nhật value (admin only)
- [ ] `is_editable=false` → 403

### Slice 4 ✓
- [ ] Next.js build thành công
- [ ] Login page render + gọi API login thành công
- [ ] Axios interceptor auto-refresh token on 401
- [ ] Tree component render với lazy-load children
- [ ] Auth store hydrate từ storage khi page reload

### Slice 5 ✓
- [ ] Course CRUD + filter by category/status/search
- [ ] CourseNode tree: tạo/sửa/xóa/di chuyển node
- [ ] Lesson CRUD + Outline sync pull content
- [ ] Complete lesson → progress cập nhật → UserProfile counters
- [ ] Frontend: catalog → tree → lesson viewer hoạt động

### Slice 6 ✓
- [ ] Challenge CRUD + ChallengeNode tree
- [ ] Flag CRUD (values không trả về cho Member)
- [ ] Submit flag đúng → `{correct: true}` + progress updated
- [ ] GitLab sync pull metadata + README
- [ ] Frontend: challenge browser + flag submit hoạt động

### Slice 7 ✓
- [ ] Quiz + Question CRUD hoạt động
- [ ] WS connect → nhận câu hỏi → trả lời → nhận kết quả → câu tiếp
- [ ] Attempt hoàn thành → UserQuizProgress cập nhật (best_score, attempt_count)
- [ ] Frontend: quiz session WS hoạt động mượt mà

### Slice 8 ✓
- [ ] `GET /api/users/me/profile/` → profile + stats
- [ ] `PATCH /api/users/me/profile/` → cập nhật display_name, bio
- [ ] Admin: list/create/update users
- [ ] Frontend: profile page + settings hoạt động

### Slice 9 ✓
- [ ] Admin broadcast notification → tất cả user nhận
- [ ] Complete challenge/quiz/course → auto notification
- [ ] WS delivery: notification xuất hiện trong 2 giây
- [ ] Mark read / mark all read hoạt động

### Slice 11 ✓
- [ ] Leaderboard sắp xếp đúng theo score
- [ ] Filter theo type: overall/challenge/quiz/course
- [ ] Admin stats: user_count, active_today, solves_week
- [ ] Frontend: leaderboard + admin stats render đúng

### Production Readiness ✓
- [ ] `auth.authorization_enabled=true` → tất cả endpoint kiểm tra quyền
- [ ] Built-in roles (Admin/Editor/Member) có đủ permissions
- [ ] Không có secret nào bị lộ qua API
- [ ] Tất cả trang frontend permission-aware (ẩn UI theo quyền)

---

## Tóm tắt chiến lược

```
┌─────────────────────────────────────────────────────────────┐
│                    NGUYÊN TẮC CHÍNH                         │
│                                                             │
│  1. Giải quyết câu hỏi mở TRƯỚC khi code                    │
│  2. Backend đi trước, Frontend theo sau (pipeline)          │
│  3. authZ bypass cho phép song song hóa                     │
│  4. API contract là hợp đồng giữa 2 người                   │
│  5. Mỗi người chuyên sâu 1 stack, review chéo               │
│  6. Không để AI (Slice 10) — đã DEFERRED                    │
│  7. Functional first, non-functional chỉ khi cần            │
│                                                             │
│  Người A (Backend): S0 → S1-BE → S2 → S5-BE → S6-BE         │
│                     → S7-BE → S8-BE → S9-BE → S11-BE        │
│                                                             │
│  Người B (Frontend): prep → S3-BE → S4 → S1-FE → S3-FE      │
│                      → S5-FE → S6-FE → S7-FE → S8-FE        │
│                      → S9-FE → S11-FE → S2-FE               │
└─────────────────────────────────────────────────────────────┘
```
