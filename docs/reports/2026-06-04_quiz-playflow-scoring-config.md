# Session Report: Quiz play-flow fix + consistent scoring + per-user practice config

**Date:** 2026-06-04
**Slices / Areas:** Slice 7 (Quiz) — WebSocket play flow, scoring/points model, per-user config

## Summary

Người dùng báo quiz đã tạo (kèm câu hỏi) nhưng khi vào làm ở giao diện user thì không hiện câu hỏi nào và nhảy thẳng tới màn finish; đồng thời điểm quiz không nhất quán. Điều tra xác nhận ba vấn đề và đã sửa trọn gói: (1) **bug gốc** — `QuizConsumer._get_attempt_questions` lọc câu hỏi theo `status='published'`, nhưng `QuizQuestion.status` mặc định `draft` và UI authoring không bao giờ set published → tập câu rỗng → finish tức thì; (2) mô hình điểm tách rời (`quiz_point` nhập tay vs tổng score câu hỏi; completion theo `best_score`); (3) thiếu UI cấu hình bài luyện ở trang detail dù `QuizConfig` đã có sẵn. Theo thống nhất với người dùng: bỏ vòng đời publish của câu hỏi, chuyển sang **mô hình điểm lai** (quiz_point auto-derive = tổng score; điểm profile tích lũy theo câu đã-từng-đúng không double-count; hoàn thành = đúng 100% câu), và bổ sung cấu hình per-user (lọc câu all/unsolved/solved, random, số câu, thời gian, immediate_feedback).

## Completed Items

- BE: bỏ filter `status` ở consumer; áp dụng config (question_filter / random_question / random_option / total_questions / immediate_feedback) tại `_get_attempt_questions` + `_build_question_payload` + `_get_config_snapshot`.
- BE: `QuizService.sync_quiz_point`, `solved_question_ids`, `earned_quiz_point`, `is_quiz_completed`, `recompute_user_quiz_points`.
- BE: signal `QuizQuestion` post_save/post_delete → resync `total_questions` + `quiz_point`; rewrite `handle_quiz_attempt_finished` (completion 100% + recompute điểm tuyệt đối).
- BE: `QuizConfig.question_filter` + `immediate_feedback` (model + migration `0011`); serializer config + `quiz_point` read-only.
- BE: data migration `0012` backfill `quiz_point` + recompute `UserProfile` quiz điểm/completion + realign `UserQuizProgress.completed_at`.
- BE tests: viết lại `test_quiz_progress_signal.py` theo mô hình mới (point derivation, completion 100%, no-double-count, no-subtract, cross-quiz), thêm regression draft-question ở `test_quiz_consumer.py`, sửa `test_quiz_api.py` (quiz_point read-only). 64 test quiz/profile/leaderboard/consumer pass.
- FE: `QuizConfigForm` (trang detail) + service `saveQuizConfig` + types (`QuizQuestionFilter`, `QuizConfigUpdatePayload`, `SessionQuestion.immediate_feedback`).
- FE: `AdminQuizForm` quiz_point read-only; `useQuizSession` tôn trọng `immediate_feedback` (tự next, ẩn thẻ kết quả giữa chừng).
- FE: i18n EN/VI (`quizzes.config.*`, `adminQuizzes.form.quizPointHint`); mocks config GET/PUT + WS question `immediate_feedback`.
- Docs: DATA_MODEL (QuizConfig + point model), API (config/quiz_point/WS notes), BUGS (F47), STATUS.

## Key Implementations

### Play-flow bug fix (root cause)

1. Questions không có vòng đời publish riêng — visibility theo trạng thái Quiz.
2. `_get_attempt_questions` bỏ `status='published'`, chỉ `filter(quiz=attempt.quiz)`.
3. Empty-quiz vẫn finish bình thường (đã có test); draft-question giờ được phục vụ (test regression mới).

### Derived quiz_point

1. `quiz_point = SUM(question.score)` qua `QuizService.sync_quiz_point`.
2. Signal `QuizQuestion` post_save/post_delete gọi `_sync_quiz_aggregates` (total_questions + quiz_point).
3. Serializer đặt `quiz_point` read-only; FE admin hiển thị giá trị tính tự động (không nhập tay).

### Cumulative profile points (no double-count) — Cách A

1. "Câu đã-từng-đúng" = `UserQuizAnswer.score_obtained > 0` qua mọi attempt (distinct theo question).
2. `earned_quiz_point(quiz,user)` = tổng score hiện tại của các câu đó (mỗi câu 1 lần).
3. `recompute_user_quiz_points(user)` set tuyệt đối `total_quiz_point` = tổng earned trên mọi quiz user từng đụng, và `quiz_completed` = số quiz đạt 100% → idempotent, làm lại không cộng thêm, sai không trừ.
4. `handle_quiz_attempt_finished` gọi recompute mỗi lần finish; completion = `is_quiz_completed` (đủ 100% câu) thay cho `best_score >= quiz_point`.

### Per-user practice config

1. `QuizConfig.question_filter` (all/unsolved/solved) + `immediate_feedback`; defaults bổ sung ở `get_or_create_user_config`.
2. Consumer snapshot config lúc start (đọc từ DB — FE auto-start sau `auth_ok`, không đổi WS protocol).
3. `_get_attempt_questions` lọc theo question_filter (dựa tập câu đã-đúng), rồi shuffle + cap số câu.
4. `_build_question_payload` đính `immediate_feedback`; FE `useQuizSession`: khi false thì tự gửi `next` và ẩn thẻ kết quả, điểm vẫn ghi server-side và hiện ở finish.
5. `QuizConfigForm` ở `QuizDetailClient` (chỉ khi quiz published) → PUT `/config/`; lưu xong mới start.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/realtime/consumers/quiz_consumer.py` | Bỏ filter status; question_filter/immediate_feedback; snapshot config |
| `backend/api/signals.py` | QuizQuestion aggregate signal; rewrite quiz-attempt-finished (completion 100% + recompute points) |
| `backend/api/services/quiz_service.py` | sync_quiz_point, solved_question_ids, earned_quiz_point, is_quiz_completed, recompute_user_quiz_points; config defaults |
| `backend/api/models.py` | QuizConfig.question_filter + immediate_feedback (+ QuestionFilter choices) |
| `backend/api/serializers/quiz.py` | quiz_point read-only; config serializer fields |
| `backend/api/migrations/0011_quizconfig_filter_feedback.py` | Schema: 2 new fields |
| `backend/api/migrations/0012_backfill_quiz_point_and_profile.py` | Data: backfill quiz_point + recompute profile/progress |
| `backend/api/tests/{test_quiz_progress_signal,test_quiz_api}.py`, `backend/realtime/tests/test_quiz_consumer.py` | Tests for new model + regression |
| `frontend/src/components/features/quizzes/{QuizConfigForm(new),QuizDetailClient,AdminQuizForm}.tsx` | Config UI; quiz_point read-only |
| `frontend/src/hooks/useQuizSession.ts` | immediate_feedback handling |
| `frontend/src/types/quiz.types.ts`, `frontend/src/services/quizzes.service.ts` | Config types + saveQuizConfig |
| `frontend/src/mocks/handlers/{quizzes,quiz-ws}.handlers.ts` | Config GET/PUT + WS immediate_feedback |
| `frontend/messages/{en,vi}.json` | quizzes.config.* + quizPointHint |
| `docs/{DATA_MODEL,API,BUGS,STATUS}.md` | Propagation |

## Notes / Caveats

- **Question status field** vẫn tồn tại trên model (không drop) nhưng không còn ảnh hưởng play flow — câu hỏi hiển thị theo trạng thái Quiz. Có thể dọn field này ở phiên normalization sau (low priority).
- **Cách A** (recompute toàn bộ `total_quiz_point` mỗi lần finish) chọn để tránh thêm bảng; quy mô ~100 user nên chi phí query không đáng kể.
- Migration `0012` realign `completed_at` cho dữ liệu cũ theo định nghĩa 100% mới (có thể clear completed_at của quiz mà tổng score câu hỏi > điểm đã đạt).
- Full backend suite chưa chạy (theo yêu cầu — quá lâu); đã chạy nhóm liên quan (quiz/profile/leaderboard/consumer = 64 passed) + `tsc --noEmit` + eslint (file quiz) xanh.
- `immediate_feedback=false`: phase câu hỏi giữ `questioning` tới khi câu kế tới; double-submit được consumer chặn (`already_answered`).
