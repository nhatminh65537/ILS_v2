CREATE TABLE user_challenge_progress (
    user_id         BIGINT NOT NULL,
    challenge_id    BIGINT NOT NULL,

    completed_at    TIMESTAMPTZ,

    PRIMARY KEY (user_id, challenge_id)
);
