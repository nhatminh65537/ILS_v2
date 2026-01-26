CREATE TYPE instance_status AS ENUM ('running', 'stopped', 'terminated');

CREATE TABLE challenge_instance (
    id              BIGSERIAL PRIMARY KEY,
    challenge_id    BIGINT NOT NULL REFERENCES challenge(id),
    user_id         BIGINT NOT NULL,

    instance_info   JSONB,
    flag_value      TEXT,

    status          instance_status NOT NULL DEFAULT 'running',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    terminated_at   TIMESTAMPTZ
);

CREATE TABLE challenge_instance_log (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_instance_id BIGINT NOT NULL REFERENCES challenge_instance(id) ON DELETE CASCADE,

    log_time            TIMESTAMPTZ NOT NULL DEFAULT now(),
    log_message         TEXT NOT NULL
);

CREATE TABLE challenge_instance_flag (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_instance_id BIGINT NOT NULL REFERENCES challenge_instance(id) ON DELETE CASCADE,

    flag_value           TEXT NOT NULL
);