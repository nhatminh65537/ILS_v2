CREATE TYPE challenge_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard', 'insane');
CREATE TYPE challenge_source AS ENUM ('manual', 'gitlab');
CREATE TYPE challenge_file_source AS ENUM ('upload', 'gitlab');

CREATE TABLE challenge (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,

    status          challenge_status NOT NULL DEFAULT 'draft',
    difficulty      challenge_difficulty,
    category_id     BIGINT,

    source          challenge_source NOT NULL DEFAULT 'manual',
    storage_path   TEXT NOT NULL,
    gitlab_path    TEXT,

    challenge_point INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    instance_required BOOLEAN NOT NULL DEFAULT false,

    FOREIGN KEY (category_id) REFERENCES challenge_category(id) ON DELETE SET NULL
);

CREATE TABLE challenge_gitlab (
    challenge_id        BIGINT PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,

    project_id          BIGINT NOT NULL,
    project_url         TEXT NOT NULL,

    default_branch      TEXT NOT NULL DEFAULT 'main',

    last_commit_sha     TEXT,
    last_synced_at      TIMESTAMPTZ
);

CREATE TABLE challenge_category (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT
);


CREATE TABLE challenge_flag (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_id         BIGINT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,

    flag_value           TEXT NOT NULL,
    is_case_sensitive    BOOLEAN NOT NULL DEFAULT true,
    is_regex             BOOLEAN NOT NULL DEFAULT false,
    random_tail_length    INTEGER NOT NULL DEFAULT 0 -- use for instance-specific flags
);


CREATE TABLE challenge_gitlab (
    challenge_id        BIGINT PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,

    project_url         TEXT NOT NULL,
    default_branch      TEXT NOT NULL DEFAULT 'main',

    last_synced_at      TIMESTAMPTZ
);


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

CREATE TYPE challenge_node_type AS ENUM ('folder', 'challenge');

CREATE TABLE challenge_node (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT REFERENCES challenge_node(id) ON DELETE CASCADE,

    node_type       challenge_node_type NOT NULL,
    title           TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,

    path            TEXT NOT NULL,

    challenge_id    BIGINT UNIQUE REFERENCES challenge(id) ON DELETE CASCADE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_node_parent ON challenge_node(parent_id);
CREATE INDEX idx_challenge_node_path ON challenge_node(path);


CREATE TABLE challenge_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE challenge_tag_map (
    challenge_id   BIGINT REFERENCES challenge(id) ON DELETE CASCADE,
    tag_id         BIGINT REFERENCES challenge_tag(id),
    PRIMARY KEY (challenge_id, tag_id)
);


CREATE TABLE user_challenge_progress (
    user_id         BIGINT NOT NULL,
    challenge_id    BIGINT NOT NULL,

    completed_at    TIMESTAMPTZ,

    PRIMARY KEY (user_id, challenge_id)
);


CREATE TABLE user_challenge_submit (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    challenge_id    BIGINT NOT NULL,

    submitted_flag  TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL,

    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submit_user_challenge 
ON user_challenge_submit(user_id, challenge_id);


CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE course (
    id              BIGSERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    status          course_status NOT NULL DEFAULT 'draft',

    category_id     BIGINT,
    estimated_time  INTEGER, -- phút
    learning_point  INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (category_id) REFERENCES course_category(id) ON DELETE SET NULL
);


CREATE TABLE course_category (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,
);


CREATE TYPE node_type AS ENUM ('folder', 'lesson');

CREATE TABLE course_node (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,

    parent_id       BIGINT REFERENCES course_node(id) ON DELETE CASCADE,
    node_type       node_type NOT NULL,

    title           TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,

    -- materialized path, ví dụ: /1/5/12/
    path            TEXT NOT NULL,

    -- chỉ dùng khi node_type = lesson
    lesson_id       BIGINT UNIQUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_node_course ON course_node(course_id);
CREATE INDEX idx_course_node_parent ON course_node(parent_id);
CREATE INDEX idx_course_node_path ON course_node(path);


CREATE TABLE course_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE course_tag_mapping (
    course_id  BIGINT REFERENCES course(id) ON DELETE CASCADE,
    tag_id     BIGINT REFERENCES course_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);


CREATE TYPE lesson_type AS ENUM ('markdown', 'video', 'quiz');
CREATE TYPE lesson_source AS ENUM ('manual', 'outline');

CREATE TABLE lesson (
    id              BIGSERIAL PRIMARY KEY,
    lesson_type     lesson_type NOT NULL,

    source          lesson_source NOT NULL DEFAULT 'manual',

    content_md      TEXT,      -- markdown
    video_url       TEXT,      -- video
    -- quiz_id         BIGINT,    -- nếu là quiz

    learning_point INTEGER DEFAULT 0,
    learning_time INTEGER, -- phút

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_question (
    lesson_id       BIGINT NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    question_id     BIGINT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, question_id)
);

CREATE TABLE lesson_outline (
    lesson_id       BIGINT PRIMARY KEY REFERENCES lesson(id) ON DELETE CASCADE,

    outline_doc_id  TEXT NOT NULL UNIQUE,
    outline_url     TEXT NOT NULL,

    last_synced_at  TIMESTAMPTZ,
    revision        INTEGER
);

CREATE TABLE user_course_progress (
    user_id         BIGINT NOT NULL,
    course_id       BIGINT NOT NULL,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    PRIMARY KEY (user_id, course_id)
);


CREATE TABLE user_lesson_progress (
    user_id         BIGINT NOT NULL,
    lesson_id       BIGINT NOT NULL,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    is_completed    BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (user_id, lesson_id)
);


CREATE TABLE quiz (
    id              BIGSERIAL PRIMARY KEY,
    node_id         BIGINT NOT NULL UNIQUE,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft/published/archived
    quiz_point      INT DEFAULT 0,
    time_limit_sec  INT,
    created_by      BIGINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_status ON quiz(status);


CREATE TABLE quiz_attempt (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    config          JSONB,         -- số câu, random, time/câu,...
    started_at      TIMESTAMPTZ DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    total_score     INT DEFAULT 0
);

CREATE INDEX idx_attempt_user ON quiz_attempt(user_id);


CREATE TABLE quiz_category (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE quiz_category_map (
    quiz_id     BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (quiz_id, category_id)
);


CREATE TABLE quiz_node (
    id          BIGSERIAL PRIMARY KEY,
    parent_id   BIGINT,
    path        TEXT NOT NULL,        -- ví dụ: /1/3/10/
    depth       INT NOT NULL,
    is_quiz     BOOLEAN NOT NULL,     -- true = quiz, false = folder
    position    INT NOT NULL DEFAULT 0,
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_node_path ON quiz_node(path);
CREATE INDEX idx_quiz_node_parent ON quiz_node(parent_id);


CREATE TABLE quiz_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE
);

CREATE TABLE quiz_tag_map (
    quiz_id BIGINT NOT NULL,
    tag_id  BIGINT NOT NULL,
    PRIMARY KEY (quiz_id, tag_id)
);

CREATE TABLE quiz_question (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL,
    question_type   VARCHAR(30) NOT NULL,
    -- single_choice | multi_choice | fill_blank | matching
    content         JSONB NOT NULL,
    explanation     TEXT,
    case_sensitive  BOOLEAN DEFAULT FALSE,
    score           INT DEFAULT 1,
    position        INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_question_quiz ON quiz_question(quiz_id);

CREATE TABLE quiz_question_option (
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL,
    content      TEXT NOT NULL,
    is_correct   BOOLEAN DEFAULT FALSE,
    position     INT NOT NULL
);

CREATE INDEX idx_option_question ON quiz_question_option(question_id);

CREATE TABLE quiz_question_answer (
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL,
    answer       TEXT NOT NULL,
    is_case_sensitive BOOLEAN DEFAULT TRUE
);


CREATE TABLE quiz_question_attempt (
    id              BIGSERIAL PRIMARY KEY,
    quiz_attempt_id BIGINT NOT NULL,
    question_id     BIGINT NOT NULL,
    user_answer     JSONB NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    answered_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_qattempt_attempt ON quiz_question_attempt(quiz_attempt_id);


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


CREATE TABLE role (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX idx_role_name ON role(name);


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


CREATE TABLE user_permission (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permission(id) ON DELETE CASCADE,

    is_granted BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (user_id, permission_id)
);


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

CREATE TABLE user_role (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);



