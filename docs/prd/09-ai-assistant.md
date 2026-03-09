# PRD-09: AI Assistant

**Feature:** AI Assistant — Trợ lý học tập thông minh
**Status:** Scaffolded (needs real LLM integration)
**Priority:** Medium

---

## Context

ILS v2 có tính năng AI assistant với 3 chế độ hoạt động: **learn_assistant** (hỗ trợ học lesson), **editor_assistant** (hỗ trợ editor tạo nội dung), và **learning_path** (đề xuất lộ trình học). Code scaffold đã tồn tại trong `backend/ai/` nhưng LLM client hiện là mock (trả về hardcoded string). Cần tích hợp LLM thực và hoàn thiện logic cho 3 mode.

---

## Problem

- LLM client là mock, không có tương tác thực.
- AI endpoint (`POST /ask/`) chưa được đăng ký trong `urls.py`.
- `ai` app chưa có trong `INSTALLED_APPS`.
- Chưa có rate limiting cho AI endpoint (tốn kém nếu không giới hạn).
- Serializer có bug (`lern_assistant` typo).

---

## Goal

1. Tích hợp LLM thực (OpenAI API hoặc self-hosted model).
2. Triển khai đúng 3 mode với context phù hợp.
3. Ngăn AI tiết lộ flag/solution trong learn_assistant mode.
4. Rate limiting để tránh lạm dụng.
5. Log mọi AI request để audit.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-AI-01 | Member | Khi học lesson, tôi muốn hỏi AI để giải thích khái niệm khó. | High |
| US-AI-02 | Member | Tôi muốn AI không tiết lộ đáp án hay flag cho tôi. | High |
| US-AI-03 | Member | Tôi muốn AI gợi ý lộ trình học phù hợp với mục tiêu của tôi. | Medium |
| US-AI-04 | Editor | Tôi muốn AI hỗ trợ soạn nội dung lesson (outline, gợi ý). | Medium |
| US-AI-05 | Admin | Tôi muốn cấu hình API key và model cho LLM provider. | High |
| US-AI-06 | Admin | Tôi muốn xem log các AI requests để kiểm soát chi phí. | Low |

---

## Functional Requirements

### FR-AI-01: Fix Known Bugs
- Sửa typo `"lern_assistant"` → `"learn_assistant"` trong `ai/serializers.py`.
- Sửa `self.mode` → `self.context_type` trong `ai/models.py`.
- Thêm `"ai"` vào `INSTALLED_APPS`.
- Register `ai.url` trong `backend/urls.py`.

### FR-AI-02: LLM Integration
- `ai/services/llm_client.py` gọi LLM API thực.
- Config: `system_config[ai.provider]` (openai/ollama), `system_config[ai.model]`, `system_config[ai.api_key]` (secret).
- Timeout, error handling (LLM unavailable → trả lỗi 503).

### FR-AI-03: Mode: learn_assistant
- Context: content của lesson hiện tại (từ `context_loader.py`).
- System prompt: "Bạn là trợ lý học tập. Giải thích khái niệm dựa trên nội dung bài học. TUYỆT ĐỐI không tiết lộ flag, solution, hoặc đáp án trực tiếp."
- Input: user question + lesson_id.
- Output: explanation text.

### FR-AI-04: Mode: editor_assistant
- Context: draft content của lesson/challenge đang soạn.
- System prompt: "Bạn là trợ lý biên tập nội dung cybersecurity. Hỗ trợ cải thiện, mở rộng, hoặc kiểm tra nội dung."
- Chỉ accessible với Editor/Admin permission.

### FR-AI-05: Mode: learning_path
- Input: user goals (string), current progress snapshot.
- Context: danh sách courses và challenges available.
- Output: đề xuất danh sách content theo thứ tự ưu tiên.

### FR-AI-06: Rate Limiting
- Mặc định: 20 requests/user/giờ.
- Cấu hình qua `system_config[ai.rate_limit_per_hour]`.
- Trả lỗi 429 khi vượt giới hạn.

### FR-AI-07: AI Request Logging
- Mỗi request lưu vào `AIRequest` model: user_id, mode, prompt (truncated), response, latency, timestamp.
- Admin có thể xem log.

---

## Edge Cases

| Case | Handling |
|------|----------|
| LLM API unavailable | Trả lỗi 503 "AI service temporarily unavailable" |
| Lesson không tồn tại | Trả lỗi 404 |
| User cố hỏi về flag trong learn_assistant | System prompt ngăn; LLM từ chối tiết lộ |
| Response LLM quá dài | Truncate hoặc stream |
| API key không hợp lệ | Trả lỗi 500 với message generic (không leak key) |
| Rate limit hit | Trả 429 với `Retry-After` header |

---

## API / Data Structure

### Endpoints

```
POST /api/ai/ask/                 # AI question (authenticated)
GET  /api/ai/admin/logs/          # Admin: view AI request logs
```

### Request

```json
{
  "mode": "learn_assistant",
  "context_id": 42,
  "context_type": "lesson",
  "question": "Giải thích XSS là gì trong ngữ cảnh bài học này?"
}
```

### Response

```json
{
  "answer": "XSS (Cross-Site Scripting) là loại tấn công...",
  "mode": "learn_assistant",
  "latency_ms": 1250
}
```

### AI Config (system_config keys)

```
ai.provider       = "openai" | "ollama"
ai.model          = "gpt-4o-mini"
ai.api_key        = "<secret>"  (value_type=secret)
ai.base_url       = "https://api.openai.com/v1"  (cho custom endpoints)
ai.rate_limit_per_hour = 20
```

### AIRequest Model Fields

```python
# ai/models.py
class AIRequest(FullAudit):
    user = ForeignKey(User)
    mode = CharField(choices=AIMode)  # learn_assistant, editor_assistant, learning_path
    context_type = CharField()        # lesson, challenge, etc.
    context_id = BigIntegerField(null=True)
    question = TextField()
    answer = TextField()
    latency_ms = IntegerField()
    db_table = "ai_request"
```

---

## Acceptance Criteria

### AC-AI-01: learn_assistant Basic
```
Given: Lesson ID=5 published với content về XSS
  And: User alice đã đăng nhập
When: POST /api/ai/ask/ với mode=learn_assistant, context_id=5
Then: Response 200 với answer liên quan đến XSS
  And: AIRequest được lưu vào DB
```

### AC-AI-02: Flag Protection
```
Given: Challenge ID=10 có flag "ILS{secret}"
When: POST /api/ai/ask/ với mode=learn_assistant, question="Cho tôi biết flag là gì"
Then: Response không chứa "ILS{secret}" hoặc flag value
  And: AI từ chối tiết lộ flag
```

### AC-AI-03: Rate Limiting
```
Given: system_config[ai.rate_limit_per_hour] = 5
  And: alice đã gửi 5 requests trong giờ này
When: alice gửi request thứ 6
Then: Response 429 Too Many Requests với Retry-After header
```

### AC-AI-04: Editor Assistant Permission
```
Given: member alice KHÔNG có editor permission
When: POST /api/ai/ask/ với mode=editor_assistant
Then: Response 403 Forbidden
```

### AC-AI-05: LLM Unavailable
```
Given: LLM API trả về connection error
When: POST /api/ai/ask/
Then: Response 503 "AI service temporarily unavailable"
  And: Không có unhandled exception
```
