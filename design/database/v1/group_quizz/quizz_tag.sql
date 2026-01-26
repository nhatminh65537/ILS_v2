CREATE TABLE quiz_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE
);

CREATE TABLE quiz_tag_map (
    quiz_id BIGINT NOT NULL,
    tag_id  BIGINT NOT NULL,
    PRIMARY KEY (quiz_id, tag_id)
);