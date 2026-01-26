CREATE TABLE system_config (
    key VARCHAR(150) PRIMARY KEY,

    value JSONB NOT NULL,

    value_type VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,

    description TEXT,

    is_runtime BOOLEAN NOT NULL DEFAULT FALSE,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_system_config_value_type
        CHECK (value_type IN (
            'bool',
            'int',
            'string',
            'json',
            'secret'
        ))
);

-- Query theo nhóm config (auth, course, challenge, ...)
CREATE INDEX idx_system_config_category
ON system_config(category);

-- Query các config cần reload runtime
CREATE INDEX idx_system_config_is_runtime
ON system_config(is_runtime);
