CREATE TABLE role (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX idx_role_name ON role(name);
