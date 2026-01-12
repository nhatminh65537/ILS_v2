CREATE TABLE user_profile (
    id BIGSERIAL PRIMARY KEY,

    -- 1–1 mapping với user
    user_id BIGINT NOT NULL UNIQUE,
    
    -- ===== Thông tin hiển thị =====
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,

    -- ===== Thông tin cá nhân mở rộng =====
    location VARCHAR(100),
    website TEXT,

    -- ===== Cấu hình cá nhân =====
    language VARCHAR(10) NOT NULL DEFAULT 'vi',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',

    -- ===== Thống kê tổng hợp (denormalized) =====
    total_lpoint INT NOT NULL DEFAULT 0,
    total_cpoint INT NOT NULL DEFAULT 0,
    total_qpoint INT NOT NULL DEFAULT 0,

    course_completed INT NOT NULL DEFAULT 0,
    challenge_completed INT NOT NULL DEFAULT 0,
    quizz_completed INT NOT NULL DEFAULT 0,

    -- ===== Trạng thái hoạt động =====
    last_active_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- ===== Metadata =====
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_user_profile_user
        FOREIGN KEY (user_id)
        REFERENCES user(id)
        ON DELETE CASCADE
);

-- Lookup theo user
CREATE INDEX idx_user_profile_user_id
ON user_profile(user_id);

-- Leaderboard
CREATE INDEX idx_user_profile_total_lpoint
ON user_profile(total_lpoint DESC);

CREATE INDEX idx_user_profile_total_cpoint
ON user_profile(total_cpoint DESC);

CREATE INDEX idx_user_profile_total_qpoint
ON user_profile(total_qpoint DESC);