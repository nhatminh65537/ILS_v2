CREATE TABLE quiz_node (
    id          BIGSERIAL PRIMARY KEY,
    parent_id   BIGINT,
    path        TEXT NOT NULL,        -- ví dụ: /1/3/10/
    depth       INT NOT NULL,
    is_quiz     BOOLEAN NOT NULL,     -- true = quiz, false = folder
    position    INT NOT NULL DEFAULT 0,
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_node_path ON quiz_node(path);
CREATE INDEX idx_quiz_node_parent ON quiz_node(parent_id);
