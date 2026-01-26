CREATE TABLE role_permission (
    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permission(id) ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);
