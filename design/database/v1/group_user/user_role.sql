CREATE TABLE user_role (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);

