CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE course (
    id              BIGSERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    status          course_status NOT NULL DEFAULT 'draft',

    category_id     BIGINT,
    estimated_time  INTEGER, -- phút
    learning_point  INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (category_id) REFERENCES course_category(id) ON DELETE SET NULL
);
