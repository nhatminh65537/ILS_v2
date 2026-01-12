CREATE TABLE permission (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,

    -- permission tree path: api.course.read
    path VARCHAR(255) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_permission_name ON permission(name);
CREATE INDEX idx_permission_path ON permission(path);
CREATE INDEX idx_permission_active ON permission(is_active);
