CREATE TABLE quiz_question (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL,
    question_type   VARCHAR(30) NOT NULL,
    -- single_choice | multi_choice | fill_blank | matching
    content         JSONB NOT NULL,
    explanation     TEXT,
    case_sensitive  BOOLEAN DEFAULT FALSE,
    score           INT DEFAULT 1,
    position        INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_question_quiz ON quiz_question(quiz_id);

CREATE TABLE quiz_question_option (
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL,
    content      TEXT NOT NULL,
    is_correct   BOOLEAN DEFAULT FALSE,
    position     INT NOT NULL
);

CREATE INDEX idx_option_question ON quiz_question_option(question_id);

CREATE TABLE quiz_question_answer (
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL,
    answer       TEXT NOT NULL,
    is_case_sensitive BOOLEAN DEFAULT TRUE
);
