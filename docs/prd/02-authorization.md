# PRD-02: Authorization (RBAC)

**Feature:** Authorization — Fine-grained Role-Based Access Control
**Status:** Planned
**Priority:** High

---

## Context

ILS v2 sử dụng **API-based authorization**: mỗi API endpoint tương ứng một permission. Permissions tự động được phát hiện khi khởi động server (metaprogramming). Roles là tập hợp permissions. Admin gán role hoặc permission trực tiếp cho user. Permissions được encode vào JWT claims để kiểm tra nhanh mà không cần DB query.

---

## Problem

Chưa có cơ chế kiểm soát quyền truy cập. Mọi user đều có thể gọi bất kỳ API nào (hoặc tất cả đều bị chặn). Không có hệ thống role/permission. Thiếu permission cache khiến mỗi request phải query DB để kiểm tra quyền.

---

## Goal

1. Tự động tạo permission record cho mỗi API endpoint khi khởi động.
2. Admin quản lý roles, gán permissions vào role, gán user vào role.
3. Admin gán/thu hồi permission trực tiếp cho user.
4. Permissions được encode vào JWT access token để kiểm tra không cần DB.
5. Cache encoded permissions trong DB, invalidate khi admin thay đổi.
6. Permission hierarchy: parent disabled → con cũng không có hiệu lực.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-AUTHZ-01 | System | Khi server khởi động, hệ thống tự tạo permission records cho tất cả endpoints. | High |
| US-AUTHZ-02 | Admin | Tôi muốn tạo role mới và gán permissions vào role. | High |
| US-AUTHZ-03 | Admin | Tôi muốn gán user vào một hoặc nhiều role. | High |
| US-AUTHZ-04 | Admin | Tôi muốn gán permission trực tiếp cho user (override role). | High |
| US-AUTHZ-05 | Admin | Tôi muốn disable một permission để tạm thời chặn tất cả user. | Medium |
| US-AUTHZ-06 | Admin | Tôi muốn xem danh sách permissions hiện tại của hệ thống. | Medium |
| US-AUTHZ-07 | Admin | Tôi muốn xem quyền của một user cụ thể. | Medium |
| US-AUTHZ-08 | System | Khi JWT được kiểm tra, hệ thống xác minh permission từ token claims. | High |
| US-AUTHZ-09 | System | Khi admin thay đổi quyền user, permission cache bị invalidate. | High |

---

## Functional Requirements

### FR-AUTHZ-01: Permission Auto-Discovery
- Khi Django khởi động (`AppConfig.ready()`), scan tất cả URL patterns.
- Với mỗi view có `permission_code` attribute hoặc decorator: upsert vào bảng `permission`.
- Nếu endpoint bị xóa mà permission vẫn trong DB: đánh dấu `is_active=False` (không xóa).
- Permissions có thể có parent (hierarchical grouping).

### FR-AUTHZ-02: Role Management (Admin)
- CRUD roles: tạo, sửa tên/mô tả, xóa role.
- Gán/bỏ permissions vào role qua `role_permission`.
- Xóa role: cascade xóa `user_role`, `role_permission`.

### FR-AUTHZ-03: User-Role Assignment (Admin)
- Gán user vào một hoặc nhiều roles qua `user_role`.
- Bỏ user khỏi role.
- Thay đổi role → tăng `user.permission_version` → invalidate cache.

### FR-AUTHZ-04: Direct User Permission (Admin)
- Gán permission trực tiếp cho user via `user_permission` với `is_granted=true/false`.
- `is_granted=false` = explicit deny (override role).
- Thay đổi → tăng `user.permission_version` → invalidate cache.

### FR-AUTHZ-05: Permission Encoding (JWT)
- Khi tạo access token: load `user_permission_cache` nếu version match.
- Nếu version lỗi thời: tính toán lại từ roles + direct permissions + hierarchy.
  - Quyền trực tiếp (`is_granted=false`) > quyền từ role.
  - Nếu parent disabled → con không có hiệu lực.
- Encode danh sách permission codes vào JWT claims.
- Lưu vào `user_permission_cache` với version mới.

### FR-AUTHZ-06: Permission Check (Middleware/Decorator)
- Decorator `@require_permission("challenge.submit")` trên view.
- Middleware extract JWT, kiểm tra permission code trong claims.
- Không cần DB query. Response 403 nếu thiếu quyền.

### FR-AUTHZ-07: Permission Hierarchy
- `permission.parent_id` tạo cây phân cấp.
- `permission.pre_path` lưu materialized path.
- Khi parent `is_active=False`: toàn bộ subtree bị vô hiệu hóa khi encode token.
- Logic xử lý ở application level (không cascade trong DB).

### FR-AUTHZ-08: Permission Cache Invalidation
- Khi admin thay đổi `user_role`, `user_permission`, hoặc `role_permission`:
  - Increment `user.permission_version`.
  - Cache sẽ được rebuild lần tạo token tiếp theo.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Permission bị xóa khỏi code nhưng còn trong DB | Đánh dấu `is_active=False`, không xóa |
| User có role A (grant permission X) và direct deny X | Direct deny thắng → không có permission X |
| Parent permission disabled, con đang active | Khi encode token: con bị bỏ qua |
| Admin xóa role đang được gán cho nhiều user | Cascade xóa user_role, tăng version cho tất cả user bị ảnh hưởng |
| Token còn hạn nhưng permission đã bị thu hồi | Token vẫn hợp lệ đến hết hạn; revoke mới có hiệu lực khi refresh |
| User không có cache (lần đầu) | Build cache on-the-fly khi tạo token |
| Circular parent reference trong permission tree | Validation khi tạo/cập nhật permission: từ chối circular |

---

## API / Data Structure

### Endpoints

```
# Permissions
GET    /api/authz/permissions/              # List all permissions
GET    /api/authz/permissions/{id}/         # Get permission detail
PATCH  /api/authz/permissions/{id}/         # Update is_active

# Roles
GET    /api/authz/roles/                    # List roles
POST   /api/authz/roles/                    # Create role
GET    /api/authz/roles/{id}/               # Role detail
PUT    /api/authz/roles/{id}/               # Update role
DELETE /api/authz/roles/{id}/               # Delete role
GET    /api/authz/roles/{id}/permissions/   # List role's permissions
POST   /api/authz/roles/{id}/permissions/   # Add permission to role
DELETE /api/authz/roles/{id}/permissions/{perm_id}/ # Remove permission

# User-Role Assignment
GET    /api/authz/users/{user_id}/roles/    # List user's roles
POST   /api/authz/users/{user_id}/roles/    # Assign role to user
DELETE /api/authz/users/{user_id}/roles/{role_id}/ # Remove role

# Direct User Permissions
GET    /api/authz/users/{user_id}/permissions/       # List direct permissions
POST   /api/authz/users/{user_id}/permissions/       # Add direct permission
DELETE /api/authz/users/{user_id}/permissions/{perm_id}/ # Remove direct permission

# Effective permissions
GET    /api/authz/users/{user_id}/effective-permissions/ # Computed permissions
```

### Key DB Tables

```sql
-- permission: id, name, description, parent_id, pre_path, is_active
-- role: id, name, description
-- role_permission: role_id, permission_id, created_at, created_by
-- user_role: user_id, role_id
-- user_permission: user_id, permission_id, is_granted
-- user_permission_cache: user_id (PK), encoded_permissions JSONB, permission_version
-- user.permission_version: INT -- incremented on any permission change
```

### Permission Code Format

```
{domain}.{action}[.{sub}]
# Examples:
"learn.view"
"learn.course.create"
"challenge.submit"
"authz.role.manage"
"quiz.question.edit"
```

### Encoded Permissions in JWT

```json
{
  "permissions": ["learn.view", "challenge.submit", "quiz.view"],
  "permission_version": 12
}
```

### Role Object

```json
{
  "id": 1,
  "name": "editor",
  "description": "Content editors",
  "permissions": [
    { "id": 5, "name": "learn.course.create", "is_active": true }
  ]
}
```

---

## Acceptance Criteria

### AC-AUTHZ-01: Permission Auto-Discovery
```
Given: Server khởi động với 50 registered endpoints có permission codes
When: AppConfig.ready() chạy
Then: 50 permission records được upsert vào DB
  And: Permissions không còn trong code được đánh dấu is_active=False
```

### AC-AUTHZ-02: JWT Permission Check
```
Given: User alice có permission "challenge.submit" trong JWT claims
When: POST /api/challenge/{id}/submit/ với JWT của alice
Then: Request được xử lý (không bị chặn bởi permission check)
```

### AC-AUTHZ-03: Permission Denied
```
Given: User bob KHÔNG có permission "challenge.submit" trong JWT claims
When: POST /api/challenge/{id}/submit/ với JWT của bob
Then: Response 403 Forbidden
```

### AC-AUTHZ-04: Direct Deny Overrides Role
```
Given: User alice thuộc role "editor" (có permission X)
  And: alice có direct user_permission với is_granted=false cho permission X
When: JWT được encode cho alice
Then: Permission X KHÔNG có trong JWT claims của alice
```

### AC-AUTHZ-05: Cache Invalidation
```
Given: User alice có permission_version=5, cache version=5
When: Admin gán thêm role mới cho alice
Then: alice.permission_version tăng lên 6
  And: Lần tạo token tiếp theo: cache được rebuild với version=6
```

### AC-AUTHZ-06: Parent Disabled
```
Given: Permission "learn.course.create" có parent "learn" đang is_active=False
When: JWT được encode cho user có permission "learn.course.create"
Then: "learn.course.create" KHÔNG xuất hiện trong JWT claims
```

### AC-AUTHZ-07: Role Delete Cascades
```
Given: Role "editor" được gán cho 10 users
When: Admin DELETE /api/authz/roles/editor/
Then: 10 user_role records bị xóa
  And: permission_version của 10 user đó được tăng
```
