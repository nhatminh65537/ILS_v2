CREATE TABLE challenge_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE challenge_tag_map (
    challenge_id   BIGINT REFERENCES challenge(id) ON DELETE CASCADE,
    tag_id         BIGINT REFERENCES challenge_tag(id),
    PRIMARY KEY (challenge_id, tag_id)
);
