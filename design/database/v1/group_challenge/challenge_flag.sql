CREATE TABLE challenge_flag (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_id         BIGINT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,

    flag_value           TEXT NOT NULL,
    is_case_sensitive    BOOLEAN NOT NULL DEFAULT true,
    is_regex             BOOLEAN NOT NULL DEFAULT false,
    random_tail_length    INTEGER NOT NULL DEFAULT 0 -- use for instance-specific flags
);
