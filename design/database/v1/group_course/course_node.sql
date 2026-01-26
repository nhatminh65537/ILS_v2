CREATE TYPE node_type AS ENUM ('folder', 'lesson');

CREATE TABLE course_node (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,

    parent_id       BIGINT REFERENCES course_node(id) ON DELETE CASCADE,
    node_type       node_type NOT NULL,

    title           TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,

    -- materialized path, ví dụ: /1/5/12/
    path            TEXT NOT NULL,

    -- chỉ dùng khi node_type = lesson
    lesson_id       BIGINT UNIQUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_node_course ON course_node(course_id);
CREATE INDEX idx_course_node_parent ON course_node(parent_id);
CREATE INDEX idx_course_node_path ON course_node(path);
