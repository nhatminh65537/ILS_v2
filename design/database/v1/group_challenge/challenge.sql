CREATE TYPE challenge_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard', 'insane');
CREATE TYPE challenge_source AS ENUM ('manual', 'gitlab');
CREATE TYPE challenge_file_source AS ENUM ('upload', 'gitlab');

CREATE TABLE challenge (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,

    status          challenge_status NOT NULL DEFAULT 'draft',
    difficulty      challenge_difficulty,
    category_id     BIGINT,

    source          challenge_source NOT NULL DEFAULT 'manual',
    storage_path   TEXT NOT NULL,
    gitlab_path    TEXT,

    challenge_point INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    instance_required BOOLEAN NOT NULL DEFAULT false,

    FOREIGN KEY (category_id) REFERENCES challenge_category(id) ON DELETE SET NULL
);

