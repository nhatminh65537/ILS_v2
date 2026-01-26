CREATE TABLE quiz_attempt (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    config          JSONB,         -- số câu, random, time/câu,...
    started_at      TIMESTAMPTZ DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    total_score     INT DEFAULT 0
);

CREATE INDEX idx_attempt_user ON quiz_attempt(user_id);
