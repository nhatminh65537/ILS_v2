CREATE TABLE user_lesson_progress (
    user_id         BIGINT NOT NULL,
    lesson_id       BIGINT NOT NULL,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    is_completed    BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (user_id, lesson_id)
);
