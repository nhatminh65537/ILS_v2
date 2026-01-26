CREATE TYPE lesson_type AS ENUM ('markdown', 'video', 'quiz');
CREATE TYPE lesson_source AS ENUM ('manual', 'outline');

CREATE TABLE lesson (
    id              BIGSERIAL PRIMARY KEY,
    lesson_type     lesson_type NOT NULL,

    source          lesson_source NOT NULL DEFAULT 'manual',

    content_md      TEXT,      -- markdown
    video_url       TEXT,      -- video
    -- quiz_id         BIGINT,    -- nếu là quiz

    learning_point INTEGER DEFAULT 0,
    learning_time INTEGER, -- phút

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_question (
    lesson_id       BIGINT NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    question_id     BIGINT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, question_id)
);

CREATE TABLE lesson_outline (
    lesson_id       BIGINT PRIMARY KEY REFERENCES lesson(id) ON DELETE CASCADE,

    outline_doc_id  TEXT NOT NULL UNIQUE,
    outline_url     TEXT NOT NULL,

    last_synced_at  TIMESTAMPTZ,
    revision        INTEGER
);