CREATE TABLE user_challenge_submit (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    challenge_id    BIGINT NOT NULL,

    submitted_flag  TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL,

    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submit_user_challenge 
ON user_challenge_submit(user_id, challenge_id);
