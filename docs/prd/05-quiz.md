# PRD-05: Quiz (Self-Practice)

**Feature:** Quiz — Hệ thống luyện tập kiến thức
**Status:** Planned
**Priority:** Medium

---

## Context

Tính năng Quiz cho phép người dùng tự luyện tập kiến thức thông qua các bài kiểm tra. Giao diện hoạt động theo luồng **answer → check → next** qua WebSocket. Quiz tổ chức theo cấu trúc folder tương tự Challenge. Có 3 loại câu hỏi: single choice, multi choice, và fill in the blank. Mỗi user có thể cấu hình bài luyện tập riêng và lịch sử được lưu lại.

---

## Problem

Chưa có hệ thống quiz. Không có WebSocket logic. Member không có cách tự ôn tập ngoài các lesson. Không có cách track tiến độ ôn tập theo thời gian.

---

## Goal

1. Editor/Admin CRUD quiz và câu hỏi theo cấu trúc folder.
2. Member thực hành qua luồng WebSocket answer → check → next.
3. Hỗ trợ 3 loại câu hỏi với cấu hình case-sensitive.
4. Lưu lịch sử attempt, track best score và số lần thử.
5. User có thể cấu hình bài luyện tập (số câu, thời gian).

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-QUIZ-01 | Editor | Tôi muốn tạo quiz mới với title, category, quiz_point. | High |
| US-QUIZ-02 | Editor | Tôi muốn thêm câu hỏi single/multi choice với options. | High |
| US-QUIZ-03 | Editor | Tôi muốn thêm câu hỏi fill in the blank với nhiều đáp án. | High |
| US-QUIZ-04 | Editor | Tôi muốn cấu hình case-sensitive per câu hỏi. | Medium |
| US-QUIZ-05 | Editor | Tôi muốn publish/archive quiz. | High |
| US-QUIZ-06 | Member | Tôi muốn xem danh sách quiz đã published. | High |
| US-QUIZ-07 | Member | Tôi muốn cấu hình bài luyện: số câu, thời gian, random. | Medium |
| US-QUIZ-08 | Member | Tôi muốn bắt đầu luyện tập và nhận câu hỏi qua WebSocket. | High |
| US-QUIZ-09 | Member | Tôi muốn gửi câu trả lời và nhận phản hồi đúng/sai ngay. | High |
| US-QUIZ-10 | Member | Tôi muốn xem giải thích sau khi trả lời sai. | Medium |
| US-QUIZ-11 | Member | Tôi muốn kết thúc bài và xem điểm tổng kết. | High |
| US-QUIZ-12 | Member | Tôi muốn xem lịch sử các lần làm bài. | Medium |

---

## Functional Requirements

### FR-QUIZ-01: Quiz CRUD
- Tạo: `title`, `description`, `category_id`, `quiz_point`, `status=draft`, `time_limit_sec`.
- `total_questions` là denormalized field — sync via Django signal khi thêm/xóa câu hỏi.
- Update, archive.
- List với filter, search.

### FR-QUIZ-02: Folder/Node Tree
- `quiz_node` với dot-separated `path` (e.g., `"1.3"`).
- Giống challenge tree pattern.
- CRUD node, reorder, move.

### FR-QUIZ-03: Question Management
- Tạo câu hỏi: `question_type`, `content` (JSONB), `explanation`, `case_sensitive`, `score`, `position`.
- **single_choice / multi_choice**: thêm `quiz_question_option` (content, is_correct, position).
- **fill_blank**: thêm `quiz_question_answer` (answer text).
- Multi-choice: tính điểm full nếu chọn đúng tất cả option đúng, không tính điểm partial.
- Xóa câu hỏi: update `quiz.total_questions` via signal.

### FR-QUIZ-04: Quiz Config (per user per quiz)
- `quiz_config` table: `total_questions`, `time_limit_sec`, `random_question`, `random_option`, `allow_review`, `allow_retry`, `max_attempt`.
- UNIQUE (quiz_id, user_id).
- Khi bắt đầu attempt: snapshot config vào `user_quiz_attempt.config`.

### FR-QUIZ-05: WebSocket Practice Session
- Kết nối: `ws://{host}/ws/quiz/{quiz_id}/`
- Flow:
  1. Client connect + gửi `{"action": "start"}`.
  2. Server tạo `user_quiz_attempt`, áp dụng config (lấy câu ngẫu nhiên nếu random).
  3. Server gửi câu hỏi đầu tiên (ẩn đáp án).
  4. Client gửi `{"action": "answer", "question_id": X, "answer_data": {...}}`.
  5. Server check đúng/sai, lưu `user_quiz_answer`, gửi kết quả + explanation.
  6. Client gửi `{"action": "next"}` để nhận câu tiếp theo.
  7. Khi hết câu: server gửi `{"action": "finish", "score": N, "total": M}`.
  8. Server update `user_quiz_attempt.finished_at`, `total_score`.
  9. Server upsert `user_quiz_progress` (best_score, attempt_count).
- Timeout: nếu user không trả lời trong `time_limit_sec` (per question hoặc tổng): auto skip/finish.

### FR-QUIZ-06: Answer Check Logic
- **single_choice**: so sánh option_id với is_correct=True.
- **multi_choice**: phải chọn đúng TẤT CẢ options có is_correct=True và KHÔNG chọn option sai.
- **fill_blank**: so sánh text với tất cả `quiz_question_answer`, tôn trọng `case_sensitive`.

### FR-QUIZ-07: Progress Tracking
- `user_quiz_attempt`: lưu từng lần làm (attempt-level).
- `user_quiz_progress`: aggregate — `best_score`, `attempt_count`, timestamps.
- Trigger/signal cập nhật `user_quiz_progress` khi `user_quiz_attempt` được save với `finished_at`.
- Khi achieve perfect score: set `completed_at` trên `user_quiz_progress`.

### FR-QUIZ-08: Category & Tag
- CRUD `quiz_category`, `quiz_tag`.
- Gán qua `quiz_tag_map`.

---

## Edge Cases

| Case | Handling |
|------|----------|
| WebSocket ngắt giữa chừng | Attempt được lưu với finished_at=null; có thể resume |
| Multi-choice: chọn đúng hết nhưng thêm 1 option sai | Sai → 0 điểm |
| Fill blank: nhiều đáp án chấp nhận được | Đúng nếu match bất kỳ answer nào |
| total_questions trong config > số câu thực tế | Lấy tất cả câu hiện có |
| max_attempt đạt giới hạn | Từ chối start attempt mới, trả lỗi 403 |
| User submit cùng question_id 2 lần trong 1 attempt | UNIQUE constraint, trả lỗi 409 |
| Quiz bị archive khi đang làm | Attempt vẫn tiếp tục; không tạo attempt mới |
| random_option=True với single-choice | Shuffle option positions trước khi gửi |
| Câu hỏi bị xóa giữa session | Skip câu đó, tính là answered |

---

## API / Data Structure

### Endpoints (HTTP)

```
# Quizzes
GET    /api/quiz/quizzes/                       # List published quizzes
POST   /api/quiz/quizzes/                       # Create quiz (editor)
GET    /api/quiz/quizzes/{id}/                  # Quiz detail
PUT    /api/quiz/quizzes/{id}/                  # Update
PATCH  /api/quiz/quizzes/{id}/status/           # Publish/archive

# Categories & Tags
GET    /api/quiz/categories/
GET    /api/quiz/tags/

# Nodes
GET    /api/quiz/nodes/
POST   /api/quiz/nodes/
PUT    /api/quiz/nodes/{id}/
DELETE /api/quiz/nodes/{id}/
POST   /api/quiz/nodes/{id}/move/

# Questions
GET    /api/quiz/quizzes/{id}/questions/        # List questions (editor: with answers)
POST   /api/quiz/quizzes/{id}/questions/        # Add question
PUT    /api/quiz/quizzes/{id}/questions/{qid}/  # Update question
DELETE /api/quiz/quizzes/{id}/questions/{qid}/  # Delete question

# Config
GET    /api/quiz/quizzes/{id}/config/           # My config for this quiz
PUT    /api/quiz/quizzes/{id}/config/           # Save config

# Progress
GET    /api/quiz/quizzes/{id}/progress/         # My progress
GET    /api/quiz/attempts/                      # My attempt history
GET    /api/quiz/attempts/{attempt_id}/         # Attempt detail
```

### WebSocket Endpoint

```
ws://{host}/ws/quiz/{quiz_id}/
```

### WebSocket Message Protocol

**Client → Server:**
```json
{ "action": "start" }
{ "action": "answer", "question_id": 5, "answer_data": { "option_ids": [2, 4] } }
{ "action": "answer", "question_id": 6, "answer_data": { "text": "XSS" } }
{ "action": "next" }
{ "action": "finish" }
```

**Server → Client:**
```json
// Question
{
  "type": "question",
  "attempt_id": 123,
  "question": {
    "id": 5, "type": "single_choice",
    "content": { "text": "What does XSS stand for?" },
    "options": [
      { "id": 1, "content": "Cross Site Scripting", "position": 0 },
      { "id": 2, "content": "Cross Server Script", "position": 1 }
    ],
    "time_limit_sec": 60
  },
  "progress": { "current": 1, "total": 10 }
}

// Answer result
{
  "type": "answer_result",
  "is_correct": false,
  "score_obtained": 0,
  "explanation": "XSS stands for Cross-Site Scripting...",
  "correct_answer": { "option_ids": [1] }
}

// Finish
{
  "type": "finish",
  "attempt_id": 123,
  "total_score": 8,
  "max_score": 10,
  "duration_sec": 145
}
```

### Key DB Tables

```sql
-- quiz: id, title, description, status, category_id, quiz_point, total_questions, time_limit_sec
-- quiz_node: id, parent_id, path, is_item, position, quiz_id, title
-- quiz_question: id, quiz_id, question_type, content JSONB, explanation, case_sensitive, score, position
-- quiz_question_option: id, question_id, content, is_correct, position
-- quiz_question_answer: id, question_id, answer
-- quiz_config: id, quiz_id, user_id, total_questions, time_limit_sec, random_question, random_option, ...
-- user_quiz_attempt: id, quiz_id, user_id, config JSONB, started_at, finished_at, total_score
-- user_quiz_answer: id, attempt_id, question_id, answer_data JSONB, score_obtained
-- user_quiz_progress: user_id, quiz_id, best_score, attempt_count, completed_at
```

---

## Acceptance Criteria

### AC-QUIZ-01: WebSocket Practice Flow
```
Given: Quiz ID=5 published với 3 câu hỏi, member alice kết nối WS
When: alice gửi {"action": "start"}
Then: Server tạo user_quiz_attempt
  And: Server gửi câu hỏi đầu tiên với type="question"
When: alice gửi {"action": "answer", "question_id": 1, "answer_data": {"option_ids":[2]}}
Then: Server check đúng/sai, gửi type="answer_result"
  And: user_quiz_answer được tạo
When: alice gửi {"action": "next"} 2 lần nữa và answer đủ 3 câu
Then: Server gửi type="finish" với total_score
  And: user_quiz_attempt.finished_at được set
  And: user_quiz_progress được upsert
```

### AC-QUIZ-02: Multi-Choice Scoring
```
Given: Câu hỏi multi_choice có đáp án đúng là options [A, B]
When: Member chọn [A, B] (đúng tất cả)
Then: score_obtained = question.score
When: Member chọn [A, B, C] (thêm option sai)
Then: score_obtained = 0
```

### AC-QUIZ-03: Fill Blank Case Insensitive
```
Given: Câu hỏi fill_blank, answer="XSS", case_sensitive=False
When: Member submit "xss" hoặc "XSS" hoặc "Xss"
Then: is_correct=True
```

### AC-QUIZ-04: Best Score Tracking
```
Given: alice đã làm quiz 3 lần với scores: 6, 8, 5
When: GET /api/quiz/quizzes/{id}/progress/
Then: best_score=8, attempt_count=3
```

### AC-QUIZ-05: Quiz Config Saved
```
Given: alice chưa có config cho quiz ID=5
When: PUT /api/quiz/quizzes/5/config/ với {"total_questions": 10, "random_question": true}
Then: quiz_config được tạo/cập nhật
  And: Lần start tiếp theo: attempt.config = config đó
```

### AC-QUIZ-06: max_attempt Enforcement
```
Given: quiz_config.max_attempt=3, alice đã làm 3 lần
When: alice gửi {"action": "start"} lần 4
Then: Server trả error "Maximum attempts reached"
```
