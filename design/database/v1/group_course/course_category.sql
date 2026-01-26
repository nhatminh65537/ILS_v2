CREATE TABLE course_category (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,
);
