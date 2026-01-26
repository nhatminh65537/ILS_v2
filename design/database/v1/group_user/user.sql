CREATE TABLE "user" (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(150), -- nullable nếu chỉ dùng SSO

    email VARCHAR(254) NOT NULL DEFAULT '',
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,

    -- RBAC / JWT
    permission_version INT NOT NULL DEFAULT 1,

    date_joined TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);