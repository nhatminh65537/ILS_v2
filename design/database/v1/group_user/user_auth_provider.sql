CREATE TABLE user_identity (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,

    -- metadata từ provider (email, avatar, raw claims...)
    extra_data JSONB,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_identity_provider
        UNIQUE (provider, external_id)
);

CREATE INDEX idx_user_identity_user ON user_identity(user_id);
CREATE INDEX idx_user_identity_provider ON user_identity(provider);
CREATE INDEX idx_user_identity_active ON user_identity(is_active);
