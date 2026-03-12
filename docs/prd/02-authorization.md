# PRD-02: Authorization (RBAC)

**Feature:** Authorization — Flat Role-Based Access Control with Bitmap Encoding
**Status:** Planned
**Priority:** High

---

## Context

ILS v2 sử dụng **API-based authorization**: mỗi API endpoint tương ứng một permission. Permissions là **flat** (không có parent/child hierarchy). Permissions tự động được phát hiện khi khởi động server thông qua decorator `@add_role_granted('Admin', 'Editor', ...)` trên mỗi view class. Roles là tập hợp permissions. Admin gán role cho user. Admin có thể deny permission cụ thể cho user (chỉ deny, không grant trực tiếp). Permissions được encode thành **binary bitmap** (base64) vào JWT claims để kiểm tra nhanh mà không cần DB query.

---

## Problem

Chưa có cơ chế kiểm soát quyền truy cập. Mọi user đều có thể gọi bất kỳ API nào (hoặc tất cả đều bị chặn). Không có hệ thống role/permission. Thiếu permission cache khiến mỗi request phải query DB để kiểm tra quyền.

---

## Goal

1. Tự động tạo permission record cho mỗi API endpoint khi khởi động (auto-discovery + auto-naming).
2. Tự động gán permissions vào built-in roles (Admin, Editor, Member) dựa trên decorator.
3. Admin quản lý custom roles, gán permissions vào role, gán user vào role.
4. Admin deny permission trực tiếp cho user (deny-only, không grant).
5. Permissions được encode thành binary bitmap (base64) vào JWT access token.
6. Cache encoded permissions trong DB, invalidate bằng per-user `permission_version`.
7. Permissions là **read-only** qua API — không cho phép PATCH/POST/DELETE trên permission records.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-AUTHZ-01 | System | Khi server khởi động, hệ thống tự tạo permission records cho tất cả endpoints và gán vào built-in roles. | High |
| US-AUTHZ-02 | Admin | Tôi muốn tạo custom role mới và gán permissions vào role. | High |
| US-AUTHZ-03 | Admin | Tôi muốn gán user vào một hoặc nhiều role. | High |
| US-AUTHZ-04 | Admin | Tôi muốn deny permission cụ thể cho user (override role grant). | High |
| US-AUTHZ-05 | Admin | Tôi muốn xem danh sách permissions hiện tại của hệ thống. | Medium |
| US-AUTHZ-06 | Admin | Tôi muốn xem quyền hiệu lực của một user cụ thể. | Medium |
| US-AUTHZ-07 | System | Khi JWT được kiểm tra, hệ thống xác minh permission từ bitmap trong token claims. | High |
| US-AUTHZ-08 | System | Khi admin thay đổi quyền user, permission cache bị invalidate (per-user version). | High |

---

## Functional Requirements

### FR-AUTHZ-01: Permission Auto-Discovery & Auto-Naming
- Khi Django khởi động (`AppConfig.ready()`), scan tất cả URL patterns.
- Với mỗi view class có decorator `@add_role_granted(...)`: tạo permission record.
- **Permission name tự động sinh**: `{app_label}.{ViewClassName}.{http_method}`.
  - Ví dụ: view `ChallengeListView` trong app `api`, method `GET` → `api.ChallengeListView.GET`.
  - Ví dụ: view `CourseDetailView` trong app `api`, method `PUT` → `api.CourseDetailView.PUT`.
- Nếu endpoint bị xóa mà permission vẫn trong DB: đánh dấu `is_active=False` (không xóa).
- Permissions là **flat** — không có `parent_id`, không có hierarchy.
- Permission records là **read-only** — admin không thể tạo/sửa/xóa permission qua API.

### FR-AUTHZ-02: Built-in Roles & `@add_role_granted`
- Decorator `@add_role_granted('Admin', 'Editor', 'Member')` trên view class.
- Khi startup, hệ thống:
  1. Tạo/upsert permission record cho mỗi (view, method).
  2. Tạo/upsert role record cho mỗi tên role trong decorator (nếu chưa tồn tại).
  3. Gán permission vào role qua `role_permission`.
- Built-in roles có `is_system=True`:
  - **Không thể xóa** qua API.
  - **Không thể sửa tên** qua API.
  - Admin vẫn có thể thêm/bớt permissions cho built-in roles (ngoài mặc định).

### FR-AUTHZ-03: Custom Role Management (Admin)
- Tạo, sửa tên/mô tả, xóa custom roles (`is_system=False`).
- Gán/bỏ permissions vào role qua `role_permission`.
- Xóa custom role: cascade xóa `user_role`, `role_permission`, tăng `permission_version` cho tất cả user bị ảnh hưởng.

### FR-AUTHZ-04: User-Role Assignment (Admin)
- Gán user vào một hoặc nhiều roles qua `user_role`.
- Bỏ user khỏi role.
- Thay đổi role → tăng `user.permission_version` → invalidate cache.

### FR-AUTHZ-05: User Permission Deny (Admin)
- Chỉ tạo entry deny (không có grant trực tiếp) qua `user_permission`.
- **Constraint**: entry deny chỉ hợp lệ nếu user thực sự có permission đó qua role.
  - Nếu admin bỏ user khỏi role → clean up `user_permission` entries không còn ý nghĩa.
- Deny override role grant: user có role A (grant X) + deny X → không có X.
- Thay đổi → tăng `user.permission_version` → invalidate cache.

### FR-AUTHZ-06: Permission Encoding — Binary Bitmap (JWT)
- Mỗi permission có `id` (auto-increment). Giới hạn ≤256 permissions.
- Khi tạo access token: load `user_permission_cache` nếu version match.
- Nếu version lỗi thời: tính toán lại:
  1. Union tất cả permission IDs từ roles của user.
  2. Trừ đi deny entries từ `user_permission`.
  3. Lọc bỏ permissions có `is_active=False`.
  4. Tạo bitmap: 256 bits (32 bytes). Bit tại vị trí `permission.id` = 1 nếu granted.
  5. Encode bitmap thành base64 (≈44 chars).
- JWT claims format:
  ```json
  {
    "permissions": "<base64-encoded-bitmap>",
    "pv": 12
  }
  ```
- Lưu vào `user_permission_cache` với version mới (`encoded_permissions` là TEXT base64).

### FR-AUTHZ-07: Permission Check (Middleware/Decorator)
- Decorator `@require_permission("api.ChallengeSubmitView.POST")` trên view.
- Middleware extract JWT, decode base64 bitmap, kiểm tra bit tại `permission.id`.
- Không cần DB query. Response 403 nếu bit = 0.
- Lookup `permission.id` from permission name: cached in memory at startup.

### FR-AUTHZ-08: Permission Cache Invalidation (Per-User)
- Mỗi user có `permission_version` (INT, default 0) trên bảng `user`.
- Khi admin thay đổi `user_role`, `user_permission`, hoặc `role_permission` ảnh hưởng user:
  - Increment `user.permission_version`.
- `user_permission_cache` lưu `permission_version`. Khi tạo token:
  - So sánh `cache.permission_version` vs `user.permission_version`.
  - Mismatch → recompute bitmap, update cache.
- **Không dùng `system_config` global** — chỉ per-user version.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Permission bị xóa khỏi code nhưng còn trong DB | Đánh dấu `is_active=False`, không xóa |
| User có role A (grant permission X) và deny X | Deny thắng → X không có trong bitmap |
| Admin xóa custom role đang được gán cho nhiều user | Cascade xóa user_role + role_permission, tăng version cho tất cả user bị ảnh hưởng |
| Admin cố xóa built-in role (is_system=True) | 400 Bad Request — không cho phép |
| Admin cố PATCH/DELETE permission record | 405 Method Not Allowed — permissions là read-only |
| Token còn hạn nhưng permission đã bị thu hồi | Token vẫn hợp lệ đến hết hạn; revoke mới có hiệu lực khi refresh |
| User không có cache (lần đầu) | Build cache on-the-fly khi tạo token |
| Số permission vượt 256 | Validation error khi auto-discovery — cần tăng bitmap size |
| Admin deny permission mà user không có qua role | Từ chối tạo deny entry (constraint: phải có qua role trước) |
| Admin bỏ user khỏi role → user có deny entries cho permissions của role đó | Clean up deny entries không còn ý nghĩa |

---

## API / Data Structure

### Endpoints

```
# Permissions (READ-ONLY)
GET    /api/authz/permissions/              # List all permissions (filterable)
GET    /api/authz/permissions/{id}/         # Get permission detail

# Roles
GET    /api/authz/roles/                    # List roles
POST   /api/authz/roles/                    # Create custom role
GET    /api/authz/roles/{id}/               # Role detail
PUT    /api/authz/roles/{id}/               # Update custom role (400 if is_system)
DELETE /api/authz/roles/{id}/               # Delete custom role (400 if is_system)
GET    /api/authz/roles/{id}/permissions/   # List role's permissions
POST   /api/authz/roles/{id}/permissions/   # Add permission to role
DELETE /api/authz/roles/{id}/permissions/{perm_id}/ # Remove permission

# User-Role Assignment
GET    /api/authz/users/{user_id}/roles/    # List user's roles
POST   /api/authz/users/{user_id}/roles/    # Assign role to user
DELETE /api/authz/users/{user_id}/roles/{role_id}/ # Remove role

# Direct User Permission Deny
GET    /api/authz/users/{user_id}/permissions/       # List deny entries
POST   /api/authz/users/{user_id}/permissions/       # Add deny entry
DELETE /api/authz/users/{user_id}/permissions/{perm_id}/ # Remove deny entry

# Effective permissions
GET    /api/authz/users/{user_id}/effective-permissions/ # Computed bitmap (decoded)
```

### Key DB Tables

```sql
-- permission: id (PK, auto-increment), name, description, is_active
--   No parent_id, no pre_path (flat)
--   name format: "{app_label}.{ViewClassName}.{http_method}"
--   Read-only via API

-- role: id, name, description, is_system BOOLEAN DEFAULT FALSE
--   is_system=TRUE → cannot delete/rename via API

-- role_permission: role_id, permission_id, created_at, created_by

-- user_role: user_id, role_id

-- user_permission: user_id, permission_id
--   Deny-only (no is_granted column — existence = deny)
--   Constraint: entry valid only if user has permission via role

-- user_permission_cache: user_id (PK), encoded_permissions TEXT, permission_version INT
--   encoded_permissions = base64-encoded bitmap (≈44 chars for 256 bits)
--   permission_version compared against user.permission_version

-- user.permission_version: INT DEFAULT 0 — per-user, incremented on any permission change
```

### Permission Name Format

```
{app_label}.{ViewClassName}.{http_method}

# Examples:
"api.ChallengeListView.GET"
"api.ChallengeListView.POST"
"api.CourseDetailView.PUT"
"api.CourseDetailView.DELETE"
"api.LessonSyncOutlineView.POST"
```

### Encoded Permissions in JWT

```json
{
  "permissions": "AAAAAAEAAAAAAAAACAAAAAAAAAA=",
  "pv": 12
}
```

`permissions` = base64-encoded binary bitmap (256 bits = 32 bytes ≈ 44 chars).
`pv` = user's permission_version at time of encoding.

**Check algorithm**: decode base64 → check bit at position `permission.id`. Bit = 1 → granted.

### Role Object (API response)

```json
{
  "id": 1,
  "name": "Admin",
  "description": "Full access",
  "is_system": true,
  "permissions": [
    { "id": 5, "name": "api.ChallengeListView.GET", "is_active": true },
    { "id": 12, "name": "api.CourseDetailView.PUT", "is_active": true }
  ]
}
```

### `@add_role_granted` Decorator Usage

```python
@add_role_granted('Admin', 'Editor')
class CourseDetailView(APIView):
    # GET, PUT, DELETE → 3 permissions auto-created:
    #   api.CourseDetailView.GET
    #   api.CourseDetailView.PUT
    #   api.CourseDetailView.DELETE
    # Both Admin and Editor roles get all 3 permissions.
    ...
```

---

## Acceptance Criteria

### AC-AUTHZ-01: Permission Auto-Discovery & Built-in Roles
```
Given: Server khởi động với 50 endpoints có @add_role_granted decorator
When: AppConfig.ready() chạy
Then: Permission records được upsert vào DB (1 per view+method)
  And: Built-in roles (Admin, Editor, Member) được tạo với is_system=True
  And: Permissions được gán vào roles theo decorator arguments
  And: Permissions không còn trong code được đánh dấu is_active=False
  And: Permission names follow format: {app_label}.{ViewClassName}.{http_method}
```

### AC-AUTHZ-02: Bitmap JWT Permission Check
```
Given: User alice có permission "api.ChallengeSubmitView.POST" (bit 15) trong JWT bitmap
When: POST /api/challenge/{id}/submit/ với JWT của alice
Then: Middleware decode base64 bitmap, check bit 15 = 1 → request allowed
```

### AC-AUTHZ-03: Permission Denied
```
Given: User bob KHÔNG có permission (bit = 0) trong JWT bitmap
When: POST /api/challenge/{id}/submit/ với JWT của bob
Then: Response 403 Forbidden
```

### AC-AUTHZ-04: Deny Overrides Role Grant
```
Given: User alice thuộc role "Editor" (có permission X, bit 15)
  And: alice có deny entry trong user_permission cho permission X
When: JWT bitmap được encode cho alice
Then: Bit 15 = 0 → Permission X KHÔNG có trong bitmap
```

### AC-AUTHZ-05: Per-User Cache Invalidation
```
Given: User alice có permission_version=5, cache version=5
When: Admin gán thêm role mới cho alice
Then: alice.permission_version tăng lên 6
  And: Lần tạo token tiếp theo: cache mismatch → bitmap recomputed → cache updated to version=6
```

### AC-AUTHZ-06: Built-in Role Protection
```
Given: Role "Admin" có is_system=True
When: Admin gửi DELETE /api/authz/roles/{admin_role_id}/
Then: Response 400 Bad Request "Cannot delete built-in role"
```

### AC-AUTHZ-07: Permission Read-Only
```
Given: Permission record id=5 tồn tại
When: Admin gửi PATCH /api/authz/permissions/5/ hoặc DELETE
Then: Response 405 Method Not Allowed
```

### AC-AUTHZ-08: Custom Role Delete Cascades
```
Given: Custom role "reviewer" (is_system=False) được gán cho 10 users
When: Admin DELETE /api/authz/roles/{reviewer_id}/
Then: 10 user_role records bị xóa
  And: role_permission records bị xóa
  And: permission_version của 10 user đó được tăng
  And: Stale deny entries cho permissions của role này được clean up
```

### AC-AUTHZ-09: Deny Entry Constraint
```
Given: User alice có role "Editor" (không có permission Y)
When: Admin POST /api/authz/users/{alice_id}/permissions/ với permission_id = Y
Then: Response 400 Bad Request "User does not have this permission via any role"
```
