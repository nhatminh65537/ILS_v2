CREATE TABLE quiz (
    id              BIGSERIAL PRIMARY KEY,
    node_id         BIGINT NOT NULL UNIQUE,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft/published/archived
    quiz_point      INT DEFAULT 0,
    time_limit_sec  INT,
    created_by      BIGINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_status ON quiz(status);

