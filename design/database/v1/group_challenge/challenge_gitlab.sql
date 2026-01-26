CREATE TABLE challenge_gitlab (
    challenge_id        BIGINT PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,

    project_id          BIGINT NOT NULL,
    project_url         TEXT NOT NULL,

    default_branch      TEXT NOT NULL DEFAULT 'main',

    last_commit_sha     TEXT,
    last_synced_at      TIMESTAMPTZ
);