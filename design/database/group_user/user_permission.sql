CREATE TABLE user_permission (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permission(id) ON DELETE CASCADE,

    is_granted BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (user_id, permission_id)
);
