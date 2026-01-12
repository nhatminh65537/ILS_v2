CREATE TABLE user_permission_cache (
    user_id BIGINT PRIMARY KEY
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    -- encoded permissions (flattened, ready for JWT)
    encoded_permissions JSONB NOT NULL,

    -- version tại thời điểm encode
    permission_version INT NOT NULL,

    -- metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_permission_cache_version
ON user_permission_cache(permission_version);
