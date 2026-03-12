# PRD-03: Learn (Course System)

**Feature:** Learn — Hệ thống khóa học
**Status:** Planned
**Priority:** Medium-High

---

## Context

Tính năng Learn cho phép tổ chức nội dung học tập theo cấu trúc cây: **Course → Folder (lồng nhau) → Lesson**. Lesson có 3 loại: markdown, video, và mini-quiz nhúng. Nội dung có thể tạo thủ công hoặc lấy từ Outline (wiki nội bộ). Hệ thống theo dõi progress của người dùng theo từng lesson và course. Cấu trúc cây dùng **dot-separated `path`** (ví dụ: `"1.3"`); lazy loading là thao tác chính.

---

## Problem

Hệ thống chưa có giao diện hoặc API nào cho nội dung học tập. Editor không thể tạo/quản lý khóa học. Member không thể xem hoặc theo dõi tiến độ. Không có tích hợp với Outline.

---

## Goal

1. Editor/Admin CRUD khóa học, folder, và lesson trong cấu trúc cây.
2. Member duyệt và học các lesson (markdown, video, mini-quiz).
3. Theo dõi progress của member trên từng lesson và course.
4. Hỗ trợ import lesson từ Outline.
5. Filter/search khóa học theo category, tag, status.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-LEARN-01 | Editor | Tôi muốn tạo khóa học mới với tiêu đề, mô tả, category, tags. | High |
| US-LEARN-02 | Editor | Tôi muốn thêm folder và lesson vào khóa học, sắp xếp thứ tự. | High |
| US-LEARN-03 | Editor | Tôi muốn tạo lesson dạng markdown với nội dung trực tiếp. | High |
| US-LEARN-04 | Editor | Tôi muốn tạo lesson dạng video bằng cách nhúng URL. | Medium |
| US-LEARN-05 | Editor | Tôi muốn tạo lesson dạng mini-quiz nhúng câu hỏi vào bài học. | Medium |
| US-LEARN-06 | Editor | Tôi muốn import lesson từ Outline bằng cách chọn document. | Medium |
| US-LEARN-07 | Editor | Tôi muốn publish/archive khóa học để kiểm soát khả năng truy cập. | High |
| US-LEARN-08 | Member | Tôi muốn xem danh sách khóa học đã published, filter theo category/tag. | High |
| US-LEARN-09 | Member | Tôi muốn mở khóa học và duyệt cây nội dung (folder + lesson). | High |
| US-LEARN-10 | Member | Tôi muốn đọc lesson markdown hoặc xem video. | High |
| US-LEARN-11 | Member | Tôi muốn đánh dấu lesson hoàn thành sau khi scroll đến cuối. | High |
| US-LEARN-12 | Member | Tôi muốn xem tiến độ hoàn thành của từng khóa học. | Medium |
| US-LEARN-13 | Admin | Tôi muốn cấu hình tài khoản Outline và độ sâu tối đa của cây. | Low |

---

## Functional Requirements

### FR-LEARN-01: Course CRUD
- Tạo course: `slug` (auto-generate từ title), `title`, `description`, `category_id`, `status=draft`, `learning_point`, `estimated_time`.
- Update: sửa mọi trường ngoài `slug`.
- Soft-delete hoặc archive.
- List với pagination, filter theo `status`, `category_id`, tag.
- Search theo `title`.

### FR-LEARN-02: Category & Tag Management
- CRUD `course_category`: name (unique), description.
- CRUD `course_tag`: name (unique), description.
- Gán/bỏ tags cho course qua `course_tag_map`.

### FR-LEARN-03: Course Node Tree (Folder + Lesson)
- Mỗi course có root node ẩn (tự tạo khi tạo course).
- Tạo folder: tạo `course_node` với `is_item=False`.
- Tạo lesson node: tạo `lesson` + `course_node` với `is_item=True`.
- `path` được tính và cập nhật tự động khi tạo/di chuyển node (dot-separated, e.g., `"1.3"`).
- Lazy loading: load children của một node theo yêu cầu bằng `filter(parent_id=X)`.
- Sắp xếp: `position` field; reorder trả về danh sách positions mới.

### FR-LEARN-04: Lesson Types
- **Markdown**: `content_md` text field, render trên frontend.
- **Video**: `video_url` embed URL (YouTube, Vimeo, hoặc trực tiếp).
- **Mini-quiz**: link đến `quiz_question` records qua `lesson_question` với `position`.

### FR-LEARN-05: Outline Integration
- Admin cấu hình `system_config[outline.url]` và `system_config[outline.api_token]`.
- API call đến Outline để list documents.
- Khi chọn document: tạo lesson với `source=outline`, `content_md` lấy từ Outline.
- Tạo `lesson_outline` record với `outline_doc_id`, `outline_url`, `last_synced_at`.
- Sync thủ công: gọi lại Outline API, cập nhật `content_md` và `last_synced_at`.
- URL học liệu trong content dùng Outline base URL từ `system_config` (không hardcode).

### FR-LEARN-06: Progress Tracking
- Khi member bắt đầu đọc lesson: upsert `user_lesson_progress` với `started_at`.
- Khi member nhấn "Complete" (sau scroll): set `completed_at`.
- Khi tất cả lesson trong course được complete: set `user_course_progress.completed_at`.
- `user_course_progress` được tạo khi member truy cập lesson đầu tiên của course.
- Tự động cộng `learning_point` vào `user_profile.total_learning_point` khi complete course.

### FR-LEARN-07: Published Content Access
- Member chỉ thấy courses với `status=published`.
- Editor/Admin thấy tất cả status.
- Node trong course draft không accessible với member.

### FR-LEARN-08: Max Depth Config
- `system_config[learn.max_tree_depth]` kiểm soát số cấp folder tối đa.
- Khi tạo folder: validate depth không vượt quá giới hạn.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Course publish nhưng không có lesson nào | Cho phép, cảnh báo khi publish |
| Di chuyển node sang folder khác | Cập nhật `path` của node đó và toàn bộ descendants |
| Xóa folder có children | Cascade delete toàn bộ subtree (nodes + lessons) |
| Outline document bị xóa trên Outline | Sync trả lỗi, hiển thị warning; content cũ vẫn còn |
| Lesson mini-quiz: question bị xóa | Lesson vẫn hiển thị, question bị ẩn khỏi mini-quiz |
| Tạo folder vượt quá max_depth | Trả lỗi 400 "Maximum folder depth exceeded" |
| Member chưa có `user_course_progress` | Tạo khi truy cập lesson đầu tiên |
| Lesson đã complete, member đọc lại | Không reset `completed_at`; vẫn hiển thị completed |
| Node reorder với position conflict | Normalize positions (0, 1, 2, ...) sau mỗi reorder |

---

## API / Data Structure

### Endpoints

```
# Courses
GET    /api/learn/courses/                      # List published courses
POST   /api/learn/courses/                      # Create course (editor)
GET    /api/learn/courses/{slug}/               # Course detail
PUT    /api/learn/courses/{slug}/               # Update course (editor)
PATCH  /api/learn/courses/{slug}/status/        # Publish/archive course
DELETE /api/learn/courses/{slug}/               # Delete course (admin)

# Categories & Tags
GET    /api/learn/categories/
POST   /api/learn/categories/
GET    /api/learn/tags/
POST   /api/learn/tags/

# Course Tree (Nodes)
GET    /api/learn/courses/{slug}/nodes/         # Get root nodes
GET    /api/learn/courses/{slug}/nodes/{id}/children/  # Lazy load children
POST   /api/learn/courses/{slug}/nodes/         # Create folder/lesson node
PUT    /api/learn/courses/{slug}/nodes/{id}/    # Update node (title, position)
DELETE /api/learn/courses/{slug}/nodes/{id}/    # Delete node
POST   /api/learn/courses/{slug}/nodes/{id}/move/  # Move node to new parent
POST   /api/learn/courses/{slug}/nodes/reorder/ # Reorder siblings

# Lessons
GET    /api/learn/lessons/{id}/                 # Lesson content
POST   /api/learn/lessons/                      # Create lesson
PUT    /api/learn/lessons/{id}/                 # Update lesson content
POST   /api/learn/lessons/{id}/sync-outline/    # Sync from Outline

# Progress
GET    /api/learn/courses/{slug}/progress/      # Course progress for current user
POST   /api/learn/lessons/{id}/progress/start/  # Mark lesson started
POST   /api/learn/lessons/{id}/progress/complete/ # Mark lesson complete
```

### Key DB Tables

```sql
-- course: id, slug, title, description, status, category_id, estimated_time, learning_point
-- course_category: id, name, description
-- course_tag: id, name
-- course_tag_map: course_id, tag_id
-- course_node: id, parent_id, is_item, title, position, course_id, path, lesson_id
-- lesson: id, title, lesson_type, source, content_md, video_url, learning_point, learning_time
-- lesson_question: lesson_id, question_id, position
-- lesson_outline: lesson_id, outline_doc_id, outline_url, last_synced_at, revision
-- user_course_progress: user_id, course_id, started_at, completed_at
-- user_lesson_progress: user_id, lesson_id, started_at, completed_at
```

### Course List Response

```json
{
  "id": 1,
  "slug": "web-security-fundamentals",
  "title": "Web Security Fundamentals",
  "description": "...",
  "status": "published",
  "category": { "id": 2, "name": "Web Security" },
  "tags": [{ "id": 3, "name": "XSS" }],
  "learning_point": 100,
  "estimated_time": 120,
  "progress": { "completed_lessons": 5, "total_lessons": 20, "percent": 25 }
}
```

### Node Tree Response

```json
{
  "id": 10,
  "title": "Chapter 1: Basics",
  "is_item": false,
  "position": 0,
  "children_count": 3,
  "children": [
    { "id": 11, "title": "Lesson 1", "is_item": true, "lesson_type": "markdown", "completed": true }
  ]
}
```

---

## Acceptance Criteria

### AC-LEARN-01: Create Course and Node Tree
```
Given: Editor đã xác thực với permission "learn.course.create"
When: POST /api/learn/courses/ với title và category
  And: POST /api/learn/courses/{slug}/nodes/ tạo folder và lesson
Then: Course được tạo với status=draft
  And: Nodes được tạo với `path` đúng
```

### AC-LEARN-02: Member Sees Only Published
```
Given: Course A status=draft, Course B status=published
When: Member GET /api/learn/courses/
Then: Chỉ Course B xuất hiện trong kết quả
```

### AC-LEARN-03: Progress Tracking
```
Given: Member alice chưa học Course B
When: POST /api/learn/lessons/5/progress/start/
Then: user_lesson_progress được tạo với started_at
  And: user_course_progress được tạo cho alice + Course B
When: POST /api/learn/lessons/5/progress/complete/
Then: user_lesson_progress.completed_at được set
```

### AC-LEARN-04: Course Completion
```
Given: Course có 3 lessons, alice đã complete 2
When: POST /api/learn/lessons/3/progress/complete/ (lesson cuối)
Then: user_course_progress.completed_at được set
  And: user_profile.total_learning_point tăng thêm course.learning_point
```

### AC-LEARN-05: Dot-Separated Path
```
Given: Node cấu trúc: Root(id=1) → Folder(id=5, path="1") → Lesson(id=10, path="1.5")
When: Lazy load children của Folder id=5
Then: Query dùng filter(parent_id=5) trả về Lesson id=10
And: depth = path.count('.') + 1 = 1 cho Folder, 2 cho Lesson
```

### AC-LEARN-06: Node Move Updates path
```
Given: Lesson node id=10 với path="1.5"
When: POST /api/learn/courses/{slug}/nodes/10/move/ với new_parent_id=7 (path="1")
Then: Node 10 có path="1.7"
  And: Tất cả descendants của 10 được cập nhật tương ứng
```

### AC-LEARN-07: Outline Sync
```
Given: Lesson đã link Outline document
When: POST /api/learn/lessons/{id}/sync-outline/
Then: content_md được cập nhật từ Outline API
  And: lesson_outline.last_synced_at được cập nhật
```
