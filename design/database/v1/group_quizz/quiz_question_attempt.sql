CREATE TABLE quiz_question_attempt (
    id              BIGSERIAL PRIMARY KEY,
    quiz_attempt_id BIGINT NOT NULL,
    question_id     BIGINT NOT NULL,
    user_answer     JSONB NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    answered_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_qattempt_attempt ON quiz_question_attempt(quiz_attempt_id);
