# PRD-04: Challenge (CTF)

**Feature:** Challenge — Hệ thống thử thách CTF
**Status:** Planned
**Priority:** Medium-High

---

## Context

Tính năng Challenge cho phép người dùng giải các bài CTF (Capture The Flag). Nội dung tổ chức theo cấu trúc folder + challenge. Challenge có thể tạo thủ công hoặc import từ GitLab (mỗi project = một challenge). Người dùng submit flag, hệ thống kiểm tra server-side. Một số challenge yêu cầu deploy instance riêng cho mỗi người dùng.

---

## Problem

Chưa có API hay giao diện nào cho challenge. Editor không thể tạo/quản lý CTF. Member không thể xem, submit flag, hay deploy instance. Không có tích hợp GitLab.

---

## Goal

1. Editor/Admin CRUD challenge theo cấu trúc folder.
2. Import challenge từ GitLab project (sync metadata + README).
3. Member submit flag; hệ thống kiểm tra server-side, lưu lịch sử.
4. Hỗ trợ deployable instances (một instance riêng mỗi user).
5. Filter/search challenge theo category, tag, difficulty, status.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-CHAL-01 | Editor | Tôi muốn tạo challenge thủ công với title, description, difficulty, flags. | High |
| US-CHAL-02 | Editor | Tôi muốn import challenge từ GitLab project. | Medium |
| US-CHAL-03 | Editor | Tôi muốn sync lại challenge từ GitLab khi có cập nhật. | Medium |
| US-CHAL-04 | Editor | Tôi muốn thêm nhiều flags cho một challenge (OSINT). | Medium |
| US-CHAL-05 | Editor | Tôi muốn cấu hình flag: case-sensitive, regex, instance-specific. | Medium |
| US-CHAL-06 | Editor | Tôi muốn publish/archive challenge. | High |
| US-CHAL-07 | Member | Tôi muốn xem danh sách challenge đã published, filter theo category/difficulty. | High |
| US-CHAL-08 | Member | Tôi muốn đọc mô tả và README của challenge. | High |
| US-CHAL-09 | Member | Tôi muốn submit flag và biết ngay kết quả đúng/sai. | High |
| US-CHAL-10 | Member | Tôi muốn deploy instance riêng cho challenge yêu cầu. | Medium |
| US-CHAL-11 | Member | Tôi muốn xem lịch sử các lần submit của mình. | Low |
| US-CHAL-12 | Admin | Tôi muốn kill instance của bất kỳ user nào. | Medium |
| US-CHAL-13 | Admin | Tôi muốn xem lịch sử khởi tạo instance. | Low |
| US-CHAL-14 | Admin | Tôi muốn cấu hình kết nối GitLab và deploy server. | Medium |
| US-CHAL-15 | Admin | Tôi muốn bật/tắt tính năng deployable. | Medium |

---

## Functional Requirements

### FR-CHAL-01: Challenge CRUD
- Tạo: `slug` (auto-generate), `title`, `description`, `difficulty`, `category_id`, `challenge_point`, `status=draft`.
- `source`: `manual` (default) hoặc `gitlab`.
- `storage_path`: đường dẫn lưu file bài làm.
- `instance_required`: boolean.
- Update mọi trường.
- List với pagination, filter, search.

### FR-CHAL-02: Folder/Node Tree
- Tương tự Course: `challenge_node` với dot-separated `path` (e.g., `"1.3"`).
- Folder và challenge đều là node.
- CRUD node, reorder, move.

### FR-CHAL-03: Flag Management
- Thêm/sửa/xóa flags cho challenge qua `challenge_flag`.
- Flag config: `flag_value`, `is_case_sensitive`, `is_regex`, `random_tail_length`.
- `random_tail_length > 0`: flag instance-specific (thêm random suffix).
- Challenge có thể có nhiều flags (bất kỳ flag nào đúng = passed).

### FR-CHAL-04: GitLab Import
- Admin cấu hình `system_config[challenge.git.url]` và `system_config[challenge.git.token]`.
- Editor chọn GitLab project: fetch metadata (title, description) + README.
- Tạo `challenge` với `source=gitlab` và `challenge_gitlab` record.
- Sync: gọi lại GitLab API, cập nhật `challenge.description` từ README, cập nhật `last_synced_at`.
- Lưu `last_commit_sha` để detect thay đổi.

### FR-CHAL-05: Flag Submission
- Member POST flag text.
- Kiểm tra theo thứ tự flags của challenge:
  - `is_regex=True`: dùng regex match.
  - `is_case_sensitive=False`: lowercase cả hai.
  - `random_tail_length > 0`: check instance-specific flag từ `challenge_instance.flag_value`.
- Nếu đúng: tạo `user_challenge_progress` với `completed_at`, cộng `challenge_point` vào profile.
- Luôn tạo `user_challenge_submit` (cả đúng lẫn sai).
- Nếu đã complete rồi: vẫn accept nhưng không cộng điểm lại.

### FR-CHAL-06: Instance Deployment
- Chỉ khi `challenge.instance_required=True` và `system_config[challenge.deploy.enabled]=True`.
- Member request deploy: gọi external deploy API (cấu hình qua `system_config`).
- Tạo `challenge_instance` với `status=running`, `expires_at` (TTL từ config), `flag_value` (nếu instance-specific).
- Partial unique index: chỉ 1 instance `running` per (user, challenge).
- Member stop instance: set `status=stopped`, `terminated_at`.
- Instance tự expire khi quá `expires_at` (background task).
- Admin: list all instances, kill instance (set `status=terminated`).

#### FR-CHAL-06.1: Deployment Strategy (Pluggable Backend)

Per `docs/REQUIREMENTS.md §2.4`, deploy mechanism phải pluggable — có thể đổi từ raw socket sang HTTP / gRPC mà không sửa code calling site.

- **Interface:** Protocol `InstanceDeploymentBackend` (xem `backend/api/services/instance_service.py:12–65`) định nghĩa các method `deploy()`, `stop()`, `terminate()`.
- **Provider selection:** chọn backend qua `system_config[challenge.deploy.provider]`. Code call site chỉ phụ thuộc Protocol, không phụ thuộc concrete class.
- **Backends hiện có:**
  - `MockDeploymentBackend` (Wave 1) — dùng cho dev/test, trả về fake instance.
  - `SocketDeploymentBackend` (Wave 2, placeholder) — kết nối raw socket tới deploy service ngoài.
- **Tương lai:** thêm `HttpDeploymentBackend` / `GrpcDeploymentBackend` chỉ cần implement Protocol và đăng ký key trong `system_config`. Không sửa view/service layer.

### FR-CHAL-07: Instance Logging
- Mỗi event quan trọng (start, stop, terminate, error) được log vào `challenge_instance_log`.

### FR-CHAL-08: Category & Tag Management
- CRUD `challenge_category` và `challenge_tag`.
- Gán/bỏ tags qua `challenge_tag_map`.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Submit flag khi đã solved | Ghi lại submission nhưng không cộng điểm |
| Submit flag rỗng | Trả lỗi 400 validation |
| Deploy instance khi deploy.enabled=False | Trả lỗi 403 "Instance deployment disabled" |
| Request deploy khi đã có running instance | Trả lỗi 409 "Instance already running" |
| GitLab project không tồn tại / không có quyền | Trả lỗi 400 với GitLab error message |
| Instance hết hạn (expires_at) | Background task set status=terminated |
| Challenge bị archive khi có running instance | Instance vẫn chạy; chỉ ẩn khỏi danh sách member |
| Flag regex không hợp lệ | Validate regex khi tạo flag, trả lỗi 400 |
| Challenge có multiple flags, submit đúng một flag | Correct; không cần đúng tất cả |
| Delete challenge node với running instances | Warn admin trước khi xóa |

---

## API / Data Structure

### Endpoints

```
# Challenges
GET    /api/challenge/challenges/               # List published challenges
POST   /api/challenge/challenges/               # Create challenge (editor)
GET    /api/challenge/challenges/{slug}/        # Challenge detail + README
PUT    /api/challenge/challenges/{slug}/        # Update challenge
PATCH  /api/challenge/challenges/{slug}/status/ # Publish/archive
DELETE /api/challenge/challenges/{slug}/        # Delete

# Categories & Tags
GET    /api/challenge/categories/
POST   /api/challenge/categories/
GET    /api/challenge/tags/
POST   /api/challenge/tags/

# Nodes (tree)
GET    /api/challenge/nodes/                    # Root nodes
GET    /api/challenge/nodes/{id}/children/
POST   /api/challenge/nodes/                    # Create node
PUT    /api/challenge/nodes/{id}/               # Update
DELETE /api/challenge/nodes/{id}/              # Delete
POST   /api/challenge/nodes/{id}/move/

# Flags
GET    /api/challenge/challenges/{slug}/flags/  # List flags (admin/editor)
POST   /api/challenge/challenges/{slug}/flags/  # Add flag
PUT    /api/challenge/challenges/{slug}/flags/{id}/
DELETE /api/challenge/challenges/{slug}/flags/{id}/

# GitLab
GET    /api/challenge/gitlab/projects/          # List GitLab projects
POST   /api/challenge/challenges/{slug}/sync-gitlab/ # Sync from GitLab

# Flag Submission
POST   /api/challenge/challenges/{slug}/submit/ # Submit flag

# Instances
GET    /api/challenge/challenges/{slug}/instance/ # My instance info
POST   /api/challenge/challenges/{slug}/instance/ # Deploy instance
DELETE /api/challenge/challenges/{slug}/instance/ # Stop instance
GET    /api/challenge/admin/instances/           # Admin: all instances
DELETE /api/challenge/admin/instances/{id}/      # Admin: kill instance

# User Progress
GET    /api/challenge/challenges/{slug}/submissions/ # My submissions
GET    /api/challenge/progress/                  # My overall progress
```

### Key DB Tables

```sql
-- challenge: id, slug, title, description, status, difficulty, category_id,
--            source, storage_path, gitlab_path, challenge_point, instance_required
-- challenge_gitlab: challenge_id, project_id, project_url, default_branch, last_commit_sha, last_synced_at
-- challenge_node: id, parent_id, is_item, title, position, path, challenge_id
-- challenge_flag: id, challenge_id, flag_value, is_case_sensitive, is_regex, random_tail_length
-- challenge_instance: id, challenge_id, user_id, instance_info JSONB, flag_value,
--                     challenge_flag_id, status, terminated_at, expires_at
-- challenge_instance_log: id, challenge_instance_id, log_time, log_message
-- user_challenge_progress: user_id, challenge_id, completed_at
-- user_challenge_submit: id, user_id, challenge_id, submitted_flag, is_correct, submitted_at
```

### Challenge Detail Response

```json
{
  "id": 5,
  "slug": "web-login-bypass",
  "title": "Login Bypass",
  "description": "...",
  "readme": "# Challenge\n...",
  "difficulty": "easy",
  "challenge_point": 100,
  "category": { "id": 1, "name": "Web" },
  "tags": [{ "id": 2, "name": "SQL Injection" }],
  "instance_required": true,
  "status": "published",
  "is_solved": false,
  "instance": null
}
```

### Flag Submit Request/Response

```json
Request:  { "flag": "ILS{th1s_1s_th3_fl4g}" }
Response (correct):   { "correct": true, "points_earned": 100 }
Response (incorrect): { "correct": false }
```

### Instance Response

```json
{
  "id": 23,
  "status": "running",
  "instance_info": { "host": "10.0.1.5", "port": 8080 },
  "expires_at": "2026-03-10T10:00:00Z",
  "created_at": "2026-03-09T10:00:00Z"
}
```

---

## Acceptance Criteria

### AC-CHAL-01: Correct Flag Submission
```
Given: Challenge "web-login-bypass" published với flag "ILS{correct}"
  And: Member alice chưa solve
When: POST /api/challenge/challenges/web-login-bypass/submit/ với {"flag": "ILS{correct}"}
Then: Response {"correct": true, "points_earned": 100}
  And: user_challenge_progress.completed_at được set
  And: user_challenge_submit tạo với is_correct=true
  And: user_profile.total_challenge_point tăng 100
```

### AC-CHAL-02: Wrong Flag
```
Given: Challenge published
When: POST submit với flag sai
Then: Response {"correct": false}
  And: user_challenge_submit tạo với is_correct=false
  And: Điểm không thay đổi
```

### AC-CHAL-03: Already Solved
```
Given: alice đã solve challenge này
When: POST submit lại với flag đúng
Then: Response {"correct": true, "points_earned": 0}
  And: Điểm không cộng thêm
```

### AC-CHAL-04: Case Insensitive Flag
```
Given: Flag "ILS{Flag}" với is_case_sensitive=False
When: Submit "ILS{FLAG}" hoặc "ils{flag}"
Then: Response {"correct": true}
```

### AC-CHAL-05: Instance Deploy Unique
```
Given: alice đã có running instance cho challenge X
When: POST /api/challenge/challenges/X/instance/ lần 2
Then: Response 409 "Instance already running"
```

### AC-CHAL-06: GitLab Sync
```
Given: Challenge linked với GitLab project
  And: README thay đổi trên GitLab
When: POST /api/challenge/challenges/{slug}/sync-gitlab/
Then: challenge.description được cập nhật
  And: challenge_gitlab.last_synced_at được cập nhật
  And: challenge_gitlab.last_commit_sha cập nhật
```

### AC-CHAL-07: Deploy Disabled
```
Given: system_config[challenge.deploy.enabled] = false
When: POST /api/challenge/challenges/{slug}/instance/
Then: Response 403 "Instance deployment is disabled"
```
