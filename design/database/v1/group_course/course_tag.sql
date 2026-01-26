CREATE TABLE course_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE course_tag_mapping (
    course_id  BIGINT REFERENCES course(id) ON DELETE CASCADE,
    tag_id     BIGINT REFERENCES course_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);
