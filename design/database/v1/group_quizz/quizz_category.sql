CREATE TABLE quiz_category (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE quiz_category_map (
    quiz_id     BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (quiz_id, category_id)
);
