CREATE TABLE user_course_progress (
    user_id         BIGINT NOT NULL,
    course_id       BIGINT NOT NULL,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    PRIMARY KEY (user_id, course_id)
);
