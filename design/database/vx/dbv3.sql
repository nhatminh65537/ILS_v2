CREATE TYPE content_status  AS ENUM ('draft', 'published', 'archived');

CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard', 'insane');
CREATE TYPE challenge_source AS ENUM ('manual', 'gitlab');
CREATE TYPE instance_status AS ENUM ('running', 'stopped', 'terminated');

CREATE TYPE lesson_type AS ENUM ('markdown', 'video', 'miniquiz');
CREATE TYPE lesson_source AS ENUM ('manual', 'outline');

CREATE TYPE question_type AS ENUM ('single_choice', 'multi_choice', 'fill_blank');

CREATE TYPE config_type AS ENUM ('bool', 'int', 'string', 'json', 'secret');

-- ########### USER ############

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

    date_joined TIMESTAMPTZ NOT NULL DEFAULT now()

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);

CREATE TABLE user_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,

    entry_year INT,
    
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,

    location VARCHAR(100),
    website TEXT,

    language VARCHAR(10) NOT NULL DEFAULT 'vi',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',

    total_learning_point INT NOT NULL DEFAULT 0,
    total_challenge_point INT NOT NULL DEFAULT 0,
    total_quiz_point INT NOT NULL DEFAULT 0,

    course_completed INT NOT NULL DEFAULT 0,
    challenge_completed INT NOT NULL DEFAULT 0,
    quiz_completed INT NOT NULL DEFAULT 0,

    last_active_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable    
);

CREATE INDEX idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX idx_user_profile_total_learning_point ON user_profile(total_learning_point DESC);
CREATE INDEX idx_user_profile_total_challenge_point ON user_profile(total_challenge_point DESC);
CREATE INDEX idx_user_profile_total_quiz_point ON user_profile(total_quiz_point DESC);

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

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id) ,     -- nullable

    CONSTRAINT uq_user_identity_provider UNIQUE (provider, external_id)
);

CREATE INDEX idx_user_identity_user_id ON user_identity(user_id);

CREATE TABLE user_session (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    device_info TEXT,
    refresh_token_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by BIGINT REFERENCES "user"(id),
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id),      -- nullable
);
CREATE INDEX idx_user_session_user_id ON user_session(user_id);

-- ########### AUTHZ ############

CREATE TABLE role (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_role_name ON role(name);

CREATE TABLE permission (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,

    parent_id BIGINT REFERENCES permission(id) ON DELETE SET NULL,
    pre_path VARCHAR(255) NOT NULL, -- logical permission path by api

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id),      -- nullable
);

CREATE INDEX idx_permission_name ON permission(name);
CREATE INDEX idx_permission_path ON permission(pre_path);
CREATE INDEX idx_permission_parent_id ON permission(parent_id);

CREATE TABLE role_permission (
    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permission(id) ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_role_permission_role_id ON role_permission(role_id);
CREATE INDEX idx_role_permission_permission_id ON role_permission(permission_id);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    role_id BIGINT NOT NULL
        REFERENCES role(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id),      -- nullable

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_role_user_id ON user_role(user_id);
CREATE INDEX idx_user_role_role_id ON user_role(role_id);

CREATE TABLE user_permission (
    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permission(id) ON DELETE CASCADE,

    is_granted BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id) ,     -- nullable

    PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX idx_user_permission_user_id ON user_permission(user_id);
CREATE INDEX idx_user_permission_permission_id ON user_permission(permission_id);

CREATE TABLE user_permission_cache (
    user_id BIGINT PRIMARY KEY
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    -- encoded permissions (flattened, ready for JWT)
    encoded_permissions JSONB NOT NULL,

    -- version tại thời điểm encode
    permission_version INT NOT NULL,

    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_permission_cache_user_id ON user_permission_cache(user_id);

-- ########### CHALLENGE ############

CREATE TABLE challenge_category (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_category_name ON challenge_category(name);

CREATE TABLE challenge (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,

    status          content_status  NOT NULL DEFAULT 'draft',
    difficulty      challenge_difficulty,
    category_id     BIGINT,

    source          challenge_source NOT NULL DEFAULT 'manual',
    storage_path   TEXT NOT NULL,
    gitlab_path    TEXT,

    challenge_point INTEGER NOT NULL DEFAULT 0,

    instance_required BOOLEAN NOT NULL DEFAULT false,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id),      -- nullable

    FOREIGN KEY (category_id) REFERENCES challenge_category(id) ON DELETE SET NULL
);

CREATE INDEX idx_challenge_title ON challenge(title);
CREATE INDEX idx_challenge_category_id ON challenge(category_id);
CREATE INDEX idx_challenge_status ON challenge(status);
CREATE INDEX idx_challenge_difficulty ON challenge(difficulty);

CREATE TABLE challenge_gitlab (
    challenge_id        BIGINT PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,

    project_id          BIGINT NOT NULL,
    project_url         TEXT NOT NULL,

    default_branch      TEXT NOT NULL DEFAULT 'main',

    last_commit_sha     TEXT,
    last_synced_at      TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE TABLE challenge_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_tag_name ON challenge_tag(name);

CREATE TABLE challenge_tag_map (
    challenge_id   BIGINT REFERENCES challenge(id) ON DELETE CASCADE,
    tag_id         BIGINT REFERENCES challenge_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (challenge_id, tag_id),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_tag_map_challenge_id ON challenge_tag_map(challenge_id);
CREATE INDEX idx_challenge_tag_map_tag_id ON challenge_tag_map(tag_id);

CREATE TABLE challenge_node (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT REFERENCES challenge_node(id) ON DELETE CASCADE,

    is_item         BOOLEAN NOT NULL, -- true nếu là item (challenge), false nếu là folder
    title           TEXT NOT NULL,

    pre_path           TEXT NOT NULL,

    challenge_id    BIGINT UNIQUE REFERENCES challenge(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_node_parent_id ON challenge_node(parent_id);
CREATE INDEX idx_challenge_node_challenge_id ON challenge_node(challenge_id);
CREATE INDEX idx_challenge_node_path ON challenge_node(pre_path text_pattern_ops);

CREATE TABLE challenge_instance (
    id              BIGSERIAL PRIMARY KEY,
    challenge_id    BIGINT NOT NULL REFERENCES challenge(id),
    user_id         BIGINT NOT NULL REFERENCES "user"(id),

    instance_info   JSONB,
    flag_value      TEXT,

    status          instance_status NOT NULL DEFAULT 'running',

    terminated_at   TIMESTAMPTZ,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_instance_challenge_id ON challenge_instance(challenge_id);
CREATE INDEX idx_challenge_instance_user_id ON challenge_instance(user_id);
CREATE INDEX idx_challenge_instance_user_id_challenge_id ON challenge_instance(user_id, challenge_id);

CREATE TABLE challenge_instance_log (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_instance_id BIGINT NOT NULL REFERENCES challenge_instance(id) ON DELETE CASCADE,

    log_time            TIMESTAMPTZ NOT NULL DEFAULT now(),
    log_message         TEXT NOT NULL,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_instance_log_challenge_instance_id ON challenge_instance_log(challenge_instance_id);

CREATE TABLE challenge_flag (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_id         BIGINT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,

    flag_value           TEXT NOT NULL,
    is_case_sensitive    BOOLEAN NOT NULL DEFAULT true,
    is_regex             BOOLEAN NOT NULL DEFAULT false,
    random_tail_length    INTEGER NOT NULL DEFAULT 0, -- use for instance-specific flags
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_challenge_flag_challenge_id ON challenge_flag(challenge_id);

CREATE TABLE user_challenge_progress (
    user_id         BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    challenge_id    BIGINT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,

    completed_at    TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable

    PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX idx_user_challenge_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX idx_user_challenge_progress_challenge_id ON user_challenge_progress(challenge_id);

CREATE TABLE user_challenge_submit (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    challenge_id    BIGINT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,

    submitted_flag  TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL,

    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_user_challenge_submit_user_id ON user_challenge_submit(user_id);
CREATE INDEX idx_user_challenge_submit_challenge_id ON user_challenge_submit(challenge_id);
CREATE INDEX idx_user_challenge_submit_user_id_challenge_id ON user_challenge_submit(user_id, challenge_id);

-- ########## COURSE ###########

CREATE TABLE course_category (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_course_category_name ON course_category(name);

CREATE TABLE course (
    id              BIGSERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    status          content_status  NOT NULL DEFAULT 'draft',

    category_id     BIGINT,
    estimated_time  INTEGER, -- phút
    learning_point  INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable

    FOREIGN KEY (category_id) REFERENCES course_category(id) ON DELETE SET NULL
);

CREATE INDEX idx_course_category_id ON course(category_id);

CREATE TABLE course_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_course_tag_name ON course_tag(name);

CREATE TABLE course_tag_map (
    course_id  BIGINT REFERENCES course(id) ON DELETE CASCADE,
    tag_id     BIGINT REFERENCES course_tag(id) ON DELETE CASCADE,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
    PRIMARY KEY (course_id, tag_id)
);

CREATE INDEX idx_course_tag_map_course_id ON course_tag_map(course_id);
CREATE INDEX idx_course_tag_map_tag_id ON course_tag_map(tag_id);

CREATE TABLE course_node (
    id              BIGSERIAL PRIMARY KEY,

    parent_id       BIGINT REFERENCES course_node(id) ON DELETE CASCADE,
    is_item         BOOLEAN NOT NULL,

    title           TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,

    course_id       BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,

    -- materialized path
    pre_path           TEXT NOT NULL,

    -- chỉ dùng khi is_item = true
    lesson_id       BIGINT UNIQUE REFERENCES lesson(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_course_node_course_id ON course_node(course_id);
CREATE INDEX idx_course_node_parent_id ON course_node(parent_id);
CREATE INDEX idx_course_node_lesson_id ON course_node(lesson_id);
CREATE INDEX idx_course_node_is_item ON course_node(is_item);
CREATE INDEX idx_course_node_path ON course_node(pre_path text_pattern_ops);

CREATE TABLE lesson (
    id              BIGSERIAL PRIMARY KEY,
    lesson_type     lesson_type NOT NULL,

    source          lesson_source NOT NULL DEFAULT 'manual',

    content_md      TEXT,      -- markdown
    video_url       TEXT,      -- video

    learning_point INTEGER DEFAULT 0,
    learning_time INTEGER, -- phút

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE TABLE lesson_question (
    lesson_id       BIGINT NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    question_id     BIGINT NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
    PRIMARY KEY (lesson_id, question_id)
);

CREATE INDEX idx_lesson_question_lesson_id ON lesson_question(lesson_id);
CREATE INDEX idx_lesson_question_question_id ON lesson_question(question_id);

CREATE TABLE lesson_outline (
    lesson_id       BIGINT PRIMARY KEY REFERENCES lesson(id) ON DELETE CASCADE,

    outline_doc_id  TEXT NOT NULL UNIQUE,
    outline_url     TEXT NOT NULL,

    last_synced_at  TIMESTAMPTZ,
    revision        INTEGER,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE TABLE user_course_progress (
    user_id         BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id       BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id),     -- nullable
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX idx_user_course_progress_course_id ON user_course_progress(course_id);

CREATE TABLE user_lesson_progress (
    user_id         BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    lesson_id       BIGINT NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable

    PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);

-- ########## quiz ###########

CREATE TABLE quiz_category (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_category_name ON quiz_category(name);

CREATE TABLE quiz (
    id              BIGSERIAL PRIMARY KEY,
    node_id         BIGINT NOT NULL UNIQUE REFERENCES quiz_node(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    status          content_status  NOT NULL DEFAULT 'draft',
    quiz_point      INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    time_limit_sec  INT,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_node_id ON quiz(node_id);
CREATE INDEX idx_quiz_status ON quiz(status);
CREATE INDEX idx_quiz_title ON quiz(title);

CREATE TABLE quiz_tag (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    description TEXT,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_tag_name ON quiz_tag(name);

CREATE TABLE quiz_tag_map (
    quiz_id BIGINT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES quiz_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (quiz_id, tag_id),
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_tag_map_quiz_id ON quiz_tag_map(quiz_id);
CREATE INDEX idx_quiz_tag_map_tag_id ON quiz_tag_map(tag_id);

CREATE TABLE quiz_question (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    question_type   question_type NOT NULL,
    content         JSONB NOT NULL,
    explanation     TEXT,
    case_sensitive  BOOLEAN DEFAULT FALSE,
    score           INT DEFAULT 1,
    position        INT NOT NULL,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_question_quiz_id ON quiz_question(quiz_id);

CREATE TABLE quiz_question_option (
    -- option for choice questions (single_choice, multi_choice)
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    is_correct   BOOLEAN DEFAULT FALSE,
    position     INT NOT NULL,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_question_option_question_id ON quiz_question_option(question_id);

CREATE TABLE quiz_question_answer (
    -- answer for fill-in-the-blank questions
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
    answer       TEXT NOT NULL,
    is_case_sensitive BOOLEAN DEFAULT TRUE,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_question_answer_question_id ON quiz_question_answer(question_id);

CREATE TABLE quiz_node (
    id          BIGSERIAL PRIMARY KEY,
    parent_id   BIGINT REFERENCES quiz_node(id) ON DELETE CASCADE,

    pre_path       TEXT NOT NULL,        -- ví dụ: /1/3/10/
    is_item     BOOLEAN NOT NULL,     -- true = quiz, false = folder

    quiz_id     BIGINT UNIQUE REFERENCES quiz(id) ON DELETE CASCADE,

    title       TEXT NOT NULL,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_quiz_node_parent_id ON quiz_node(parent_id);
CREATE INDEX idx_quiz_node_quiz_id ON quiz_node(quiz_id);
CREATE INDEX idx_quiz_node_path ON quiz_node(pre_path text_pattern_ops);

CREATE TABLE user_quiz_attempt (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    config          JSONB,         -- số câu, random, time/câu,...
    started_at      TIMESTAMPTZ DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    total_score     INT DEFAULT 0,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_user_quiz_attempt_quiz_id ON user_quiz_attempt(quiz_id);
CREATE INDEX idx_user_quiz_attempt_user_id ON user_quiz_attempt(user_id);
CREATE INDEX idx_user_quiz_attempt_user_id_quiz_id ON user_quiz_attempt(user_id, quiz_id, started_at DESC);

CREATE TABLE user_quiz_answer (
    id                  BIGSERIAL PRIMARY KEY,
    attempt_id          BIGINT NOT NULL REFERENCES user_quiz_attempt(id) ON DELETE CASCADE,
    question_id         BIGINT NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
    answer_data         JSONB NOT NULL,  -- lưu trữ câu trả lời (option id, text,...)
    score_obtained     INT DEFAULT 0,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_user_quiz_answer_attempt_id ON user_quiz_answer(attempt_id);
CREATE INDEX idx_user_quiz_answer_question_id ON user_quiz_answer(question_id);

CREATE TABLE quiz_config (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL
        REFERENCES quiz(id) ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES "user"(id) ON DELETE CASCADE,

    total_questions INT,                -- số câu lấy ra
    time_limit_sec INT,                 -- thời gian làm bài
    random_question BOOLEAN DEFAULT TRUE,
    random_option BOOLEAN DEFAULT TRUE,

    allow_review BOOLEAN DEFAULT TRUE,
    allow_retry BOOLEAN DEFAULT TRUE,
    max_attempt INT,                    -- NULL = unlimited

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);


--- ############ CONFIG ############

CREATE TABLE system_config (
    key VARCHAR(150) PRIMARY KEY,

    value JSONB NOT NULL,

    value_type config_type NOT NULL,
    category VARCHAR(50) NOT NULL,

    description TEXT,

    is_runtime BOOLEAN NOT NULL DEFAULT FALSE,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE INDEX idx_system_config_category ON system_config(category);
CREATE INDEX idx_system_config_is_runtime ON system_config(is_runtime);
CREATE INDEX idx_system_config_is_editable ON system_config(is_editable);

-- ########## NOTIFY ##########
CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    payload JSONB,              -- optional extra data
    send_at TIMESTAMPTZ,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);

CREATE TABLE user_notification (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT REFERENCES notification(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES "user"(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES "user"(id),     -- nullable
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT REFERENCES "user"(id)      -- nullable
);
CREATE INDEX idx_user_notification_user_id ON user_notification(user_id);
CREATE INDEX idx_user_notification_user_id_is_read ON user_notification(user_id, is_read);

-- ########## AUDIT LOG ##########
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES "user"(id),
    event_type VARCHAR(100) NOT NULL, -- e.g., 'role_grant','permission_update','user_delete'
    target_table TEXT,
    target_id BIGINT,
    diff JSONB,        -- optional before/after or metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_target ON audit_log(target_table, target_id);

-- ORM Abstract Models:
-- - CreateAudit
-- - UpdateAudit
-- - SoftDeleteAudit
-- - BaseNode
-- - BaseCategory
-- - BaseTag

-- Later version table
-- - user_point_log

-- Later version change
-- - Hỗ trợ status cho node của course (only), lesson, question
-- - user answer layer for quiz

-- Notes for chat