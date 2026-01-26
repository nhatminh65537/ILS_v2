CREATE TYPE challenge_node_type AS ENUM ('folder', 'challenge');

CREATE TABLE challenge_node (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT REFERENCES challenge_node(id) ON DELETE CASCADE,

    node_type       challenge_node_type NOT NULL,
    title           TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,

    path            TEXT NOT NULL,

    challenge_id    BIGINT UNIQUE REFERENCES challenge(id) ON DELETE CASCADE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_node_parent ON challenge_node(parent_id);
CREATE INDEX idx_challenge_node_path ON challenge_node(path);
