# DATA_MODEL.md — ILS v2 Data Model Reference

> **This file is the authoritative data model reference.**
> ORM implementation: `backend/api/models.py`
> Legacy SQL: `design/database/vx/dbv3.sql` (historical reference only — pre-normalization)
> When DATA_MODEL.md and ORM conflict, **DATA_MODEL.md wins**.

---

## 1. Enumerations

All PostgreSQL ENUMs map to Django `TextChoices`.

| Enum | Values |
|------|--------|
| `content_status` | `draft`, `published`, `archived` |
| `challenge_difficulty` | `easy`, `medium`, `hard`, `insane` |
| `challenge_source` | `manual`, `gitlab` |
| `instance_status` | `running`, `stopped`, `terminated` |
| `lesson_type` | `markdown`, `video`, `miniquiz` |
| `lesson_source` | `manual`, `outline` |
| `question_type` | `single_choice`, `multi_choice`, `fill_blank` |
| `config_type` | `bool`, `int`, `string`, `json`, `secret` |
| `notification_type` | `manual`, `auto_challenge_complete`, `auto_course_complete`, `auto_quiz_complete`, `system` |

---

## 2. Audit Fields Pattern

All non-join tables inherit these audit fields (mapped to `FullAudit` abstract model):

```
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
created_by  BIGINT REFERENCES user(id)   -- nullable
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_by  BIGINT REFERENCES user(id)   -- nullable
```

**Join tables** (tag maps, role_permission) use **CreateAudit only** — no `updated_at`/`updated_by`.

---

## 3. Entity Types by Domain

### 3.1 User Domain

#### `user`
Primary authentication record.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `username` | VARCHAR(150) | NOT NULL, UNIQUE |
| `password` | VARCHAR(150) | nullable (null = SSO-only user) |
| `email` | VARCHAR(254) | NOT NULL, DEFAULT '' |
| `first_name` | VARCHAR(150) | NOT NULL, DEFAULT '' |
| `last_name` | VARCHAR(150) | NOT NULL, DEFAULT '' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `is_staff` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `is_superuser` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `permission_version` | INT | NOT NULL, DEFAULT 0 — incremented when roles/permissions change |
| *(audit fields)* | | |

**Indexes:** `username`, `email`

**Validation rules:**
- `username`: max 150 chars, unique across all users
- `password`: nullable — user may have SSO identity only (check `user_identity` instead)
- `email`: not unique at DB level (one email may map to multiple providers), but validated at app level

---

#### `user_profile`
One-to-one extended profile. Created automatically on user creation.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → user(id) CASCADE |
| `entry_year` | INT | nullable |
| `display_name` | VARCHAR(100) | nullable |
| `avatar_url` | TEXT | nullable |
| `bio` | TEXT | nullable |
| `location` | VARCHAR(100) | nullable |
| `website` | TEXT | nullable |
| `language` | VARCHAR(10) | NOT NULL, DEFAULT 'vi' |
| `theme` | VARCHAR(20) | NOT NULL, DEFAULT 'system' |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' |
| `total_learning_point` | INT | NOT NULL, DEFAULT 0 |
| `total_challenge_point` | INT | NOT NULL, DEFAULT 0 |
| `total_quiz_point` | INT | NOT NULL, DEFAULT 0 |
| `course_completed` | INT | NOT NULL, DEFAULT 0 |
| `challenge_completed` | INT | NOT NULL, DEFAULT 0 |
| `quiz_completed` | INT | NOT NULL, DEFAULT 0 |
| `last_active_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

**Indexes:** `user_id`, `total_learning_point DESC`, `total_challenge_point DESC`, `total_quiz_point DESC`

**Business rule:** Counter fields (`total_*`, `*_completed`) are **denormalized**. Must be synced via Django signals (no DB triggers).

---

#### `user_identity`
SSO provider links. A user can have multiple identities (one per provider).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `provider` | VARCHAR(50) | NOT NULL |
| `external_id` | VARCHAR(255) | NOT NULL |
| `extra_data` | JSONB | nullable — raw claims from provider |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| *(audit fields)* | | |

**Constraints:** UNIQUE (`provider`, `external_id`)

---

#### `user_session`
Multi-device refresh token tracking.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `device_info` | TEXT | nullable |
| `refresh_token_hash` | TEXT | NOT NULL — **never store plaintext** |
| `last_used_at` | TIMESTAMPTZ | nullable |
| `expires_at` | TIMESTAMPTZ | nullable |
| `revoked_at` | TIMESTAMPTZ | nullable |
| `revoked_by` | BIGINT | nullable, FK → user(id) |
| *(audit fields)* | | |

**Validation rules:**
- `refresh_token_hash`: always hash before storing (e.g., SHA-256)
- A session is "active" if `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`

---

### 3.2 Authorization Domain

#### `role`
Named collection of permissions.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `description` | TEXT | nullable |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| *(audit fields)* | | |

**Business rules:**
- `is_system=TRUE`: built-in role (e.g., Admin, Editor, Member), auto-created at startup via `@add_role_granted` decorator scan. Cannot be deleted or have permissions modified via API.
- `is_system=FALSE`: custom role created by admin via API, fully manageable.

---

#### `permission`
Flat API-scoped permission. Auto-discovered at startup via endpoint scan. **No hierarchy** — roles provide grouping.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK, auto-increment — used as bit index for bitmap encoding |
| `name` | VARCHAR(150) | NOT NULL, UNIQUE |
| `description` | TEXT | nullable |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| *(audit fields)* | | |

**Indexes:** `name`

**Business rules:**
- Permissions **cannot be deleted** (even by superuser). When an API endpoint is removed, its permission becomes inactive (`is_active=FALSE`) and stays in DB.
- `is_active` is controlled **only by startup scan**: `TRUE` = endpoint exists in code, `FALSE` = endpoint removed. Admin **cannot** toggle `is_active` via API.
- Permissions are **read-only via API** — only `GET` is allowed. No `PATCH`/`PUT`/`POST`/`DELETE`.
- Permission `name` is **auto-generated** in lowercase: `{app_label}.{resource_name}.{handler_method_name}`.
	- `resource_name`: class name bỏ hậu tố `ViewSet`/`View`/`APIView`/`GenericViewSet`, normalize snake_case
	- `handler_method_name`: method Python xử lý endpoint (`list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`, custom action hoặc `get`/`post`...)
	- Examples: `api.course.tree`, `api.challenge.submit_flag`, `auth_app.register.post`.
	Optional override via `permission_code` attribute on view.
- Permission `id` serves as the **bit index** for bitmap encoding (≤ 256 permissions). IDs are auto-increment, never reused.
- Permissions are **created at startup** via endpoint scan (metaprogramming). All existing permissions set to `is_active=FALSE` first, then re-scan marks found ones active.
- **No hierarchy:** `parent_id` and `pre_path` removed. Roles provide sufficient grouping.

---

#### `role_permission` (join table, CreateAudit only)

| Field | Type | Constraints |
|-------|------|-------------|
| `role_id` | BIGINT | PK part, FK → role(id) CASCADE |
| `permission_id` | BIGINT | PK part, FK → permission(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `created_by` | BIGINT | nullable, FK → user(id) |

---

#### `user_role` (join table)

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `role_id` | BIGINT | PK part, FK → role(id) CASCADE |
| *(audit fields)* | | |

---

#### `user_permission` (join table)
Direct permission deny overrides for a user. **Deny-only** — row existence = deny. No `is_granted` column.

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `permission_id` | BIGINT | PK part, FK → permission(id) CASCADE |
| *(audit fields)* | | |

**Business rules:**
- An entry **only exists if** the user has the permission via at least one role. If the user does not have the permission via any role, no deny entry is allowed.
- Row existence explicitly revokes the permission even if granted via role (deny > role grant).
- When a user is removed from a role, orphaned deny entries (for permissions no longer granted by any remaining role) are **automatically cleaned up** at app level.
- Deny entries take **priority** over role-assigned permissions.

---

#### `user_permission_cache`
Pre-encoded permission bitmap for fast JWT generation. One row per user.

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK, FK → user(id) CASCADE |
| `encoded_permissions` | TEXT | NOT NULL — base64-encoded binary bitmap (max 32 bytes = 256 bits) |
| `permission_version` | INT | NOT NULL — must match `user.permission_version` (per-user) |
| `generated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Business rules:**
- Cache is **invalidated** when admin changes a user's roles or permissions.
- `permission_version` is compared against `user.permission_version` (per-user INT, not global). If stale, regenerate before issuing new tokens.
- On cache miss or version mismatch: recompute permissions from DB, store, then issue token.
- **Bitmap format:** Each permission `id` maps to a bit position. If the bit is set (1), the user has that permission. Encoded as base64 string for compact storage and JWT claim.
- **JWT claims:** `{"permissions": "<base64-bitmap>", "pv": <permission_version>}` — separate claims for bitmap and version.

---

### 3.3 Challenge Domain

#### `challenge_category`

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `name` | TEXT | NOT NULL, UNIQUE |
| `description` | TEXT | nullable |
| *(audit fields)* | | |

---

#### `challenge`
Core challenge entity.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `slug` | TEXT | NOT NULL, UNIQUE — URL-friendly identifier |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `status` | content_status | NOT NULL, DEFAULT 'draft' |
| `difficulty` | challenge_difficulty | nullable |
| `category_id` | BIGINT | nullable, FK → challenge_category(id) SET NULL |
| `source` | challenge_source | NOT NULL, DEFAULT 'manual' |
| `storage_path` | TEXT | NOT NULL — local file storage path |
| `gitlab_path` | TEXT | nullable — only for gitlab-sourced challenges |
| `challenge_point` | INTEGER | NOT NULL, DEFAULT 0 |
| `instance_required` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| *(audit fields)* | | |

**Indexes:** `slug`, `title`, `category_id`, `status`, `difficulty`, `source`

**Validation rules:**
- `slug`: URL-safe, unique, required
- `storage_path`: required even for gitlab challenges (local cache/mirror path)
- `instance_required`: if TRUE, user must start an instance before flag submission

---

#### `challenge_gitlab`
GitLab project metadata for gitlab-sourced challenges. One-to-one with challenge.

| Field | Type | Constraints |
|-------|------|-------------|
| `challenge_id` | BIGINT | PK, FK → challenge(id) CASCADE |
| `project_id` | BIGINT | NOT NULL |
| `project_url` | TEXT | NOT NULL |
| `default_branch` | TEXT | NOT NULL, DEFAULT 'main' |
| `last_commit_sha` | TEXT | nullable |
| `last_synced_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

---

#### `challenge_tag` and `challenge_tag_map` (join, CreateAudit only)

Standard tag pattern. `challenge_tag_map(challenge_id, tag_id)` is the join table.

---

#### `challenge_node`
Tree node for challenge folder/item hierarchy. Extends `BaseNode`.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `parent_id` | BIGINT | nullable, FK → challenge_node(id) CASCADE |
| `is_item` | BOOLEAN | NOT NULL — TRUE=challenge item, FALSE=folder |
| `title` | TEXT | NOT NULL |
| `position` | INTEGER | NOT NULL, DEFAULT 0 — order within same parent |
| `path` | TEXT | NOT NULL, DEFAULT '' — dot-separated ancestor IDs e.g. `1.3.10` |
| `challenge_id` | BIGINT | UNIQUE, nullable, FK → challenge(id) CASCADE |
| *(audit fields)* | | |

**Indexes:** `parent_id`, `challenge_id`, `path`

**Business rules:**
- `is_item=FALSE` → folder node, `challenge_id` must be NULL
- `is_item=TRUE` → leaf node, `challenge_id` must be set (UNIQUE ensures 1 node per challenge)
- `path` format: dot-separated ancestor IDs (not including self). Root nodes: `path = ""`. Child of node id=1: `path = "1"`. Grandchild: `path = "1.3"`
- Depth = 0 if `path` is empty, else `path.count('.') + 1`
- On create: `path = parent.path + "." + str(parent.id)` (if parent exists, else `""`)
- On move: update `path` for self AND all descendants
- Lazy loading: load direct children via `parent_id` filter (no subtree prefix query needed for normal operations)

---

#### `challenge_flag`
Flag definition. A challenge may have multiple flags (e.g., OSINT multi-flag).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `challenge_id` | BIGINT | NOT NULL, FK → challenge(id) CASCADE |
| `flag_value` | TEXT | NOT NULL — the flag template or static value |
| `is_case_sensitive` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `is_regex` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `random_tail_length` | INTEGER | NOT NULL, DEFAULT 0 — > 0 for instance-specific flags |
| *(audit fields)* | | |

**Business rules:**
- `random_tail_length > 0`: flag is per-instance; actual flag = `flag_value + random_suffix(random_tail_length)`
- `is_regex=TRUE`: submitted flag is matched as regex against `flag_value`
- Flag checking is **server-side only** — never expose flag values to client

---

#### `challenge_instance`
Per-user challenge instance (for deployable challenges).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `challenge_id` | BIGINT | NOT NULL, FK → challenge(id) |
| `user_id` | BIGINT | NOT NULL, FK → user(id) |
| `instance_info` | JSONB | nullable — connection info returned by deploy system |
| `flag_value` | TEXT | nullable — actual flag for this instance (if random) |
| `challenge_flag_id` | BIGINT | nullable, FK → challenge_flag(id) — which flag template used |
| `status` | instance_status | NOT NULL, DEFAULT 'running' |
| `terminated_at` | TIMESTAMPTZ | nullable |
| `expires_at` | TIMESTAMPTZ | nullable — TTL configured by admin |
| *(audit fields)* | | |

**Indexes:**
- `(challenge_id)`, `(user_id)`, `(user_id, challenge_id)`
- **Partial unique index**: UNIQUE `(user_id, challenge_id)` WHERE `status = 'running'`

**Business rule:** Only **1 running instance** per (user, challenge) at any time. Enforced by partial unique index and `UniqueConstraint(condition=Q(status='running'))` in ORM.

---

#### `challenge_instance_log`

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `challenge_instance_id` | BIGINT | NOT NULL, FK → challenge_instance(id) CASCADE |
| `log_time` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `log_message` | TEXT | NOT NULL |
| *(audit fields)* | | |

---

#### `user_challenge_progress`
Tracks whether a user has completed a challenge.

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `challenge_id` | BIGINT | PK part, FK → challenge(id) CASCADE |
| `completed_at` | TIMESTAMPTZ | nullable — set on first correct flag submission |
| *(audit fields)* | | |

---

#### `user_challenge_submit`
Log of all flag submission attempts.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `challenge_id` | BIGINT | NOT NULL, FK → challenge(id) CASCADE |
| `submitted_flag` | TEXT | NOT NULL |
| `is_correct` | BOOLEAN | NOT NULL |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| *(audit fields)* | | |

**Indexes:** `(user_id)`, `(challenge_id)`, `(user_id, challenge_id)`, `submitted_at DESC`

---

### 3.4 Course Domain

#### `course_category`

Standard category pattern. See `challenge_category`.

---

#### `course`

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `slug` | TEXT | NOT NULL, UNIQUE |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `status` | content_status | NOT NULL, DEFAULT 'draft' |
| `category_id` | BIGINT | nullable, FK → course_category(id) SET NULL |
| `estimated_time` | INTEGER | nullable — minutes |
| `learning_point` | INTEGER | DEFAULT 0 |
| *(audit fields)* | | |

**Indexes:** `category_id`, `status`

---

#### `course_tag` and `course_tag_map` (join, CreateAudit only)

Standard tag pattern.

---

#### `lesson`
A single learning unit. Can be shared across courses (referenced via `course_node`).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `title` | TEXT | NOT NULL |
| `lesson_type` | lesson_type | NOT NULL — `markdown`, `video`, `miniquiz` |
| `source` | lesson_source | NOT NULL, DEFAULT 'manual' |
| `status` | content_status | NOT NULL, DEFAULT 'draft' |
| `content_md` | TEXT | nullable — markdown content (for markdown type) |
| `video_url` | TEXT | nullable — video URL (for video type) |
| `learning_point` | INTEGER | DEFAULT 0 |
| `learning_time` | INTEGER | nullable — minutes |
| *(audit fields)* | | |

**Type-specific rules:**
- `lesson_type='markdown'`: `content_md` should be set; `video_url` null
- `lesson_type='video'`: `video_url` should be set; `content_md` null
- `lesson_type='miniquiz'`: questions linked via `lesson_question`; both content fields may be null

---

#### `lesson_question` (join table)
Links a lesson (miniquiz) to quiz questions.

| Field | Type | Constraints |
|-------|------|-------------|
| `lesson_id` | BIGINT | PK part, FK → lesson(id) CASCADE |
| `question_id` | BIGINT | PK part, FK → quiz_question(id) CASCADE |
| `position` | INTEGER | NOT NULL, DEFAULT 0 — question order in miniquiz |
| *(audit fields)* | | |

---

#### `lesson_outline`
Outline document integration metadata. One-to-one with lesson.

| Field | Type | Constraints |
|-------|------|-------------|
| `lesson_id` | BIGINT | PK, FK → lesson(id) CASCADE |
| `outline_doc_id` | TEXT | NOT NULL, UNIQUE |
| `outline_url` | TEXT | NOT NULL |
| `last_synced_at` | TIMESTAMPTZ | nullable |
| `revision` | INTEGER | nullable |
| *(audit fields)* | | |

**Business rule:** Outline base URL is stored in `system_config` (key: `outline_base_url`), not in individual records. Changing the base URL in config is sufficient — no per-lesson URL updates needed.

---

#### `course_node`
Tree node for course folder/lesson hierarchy. Extends `BaseNode`.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `parent_id` | BIGINT | nullable, FK → course_node(id) CASCADE |
| `is_item` | BOOLEAN | NOT NULL |
| `title` | TEXT | NOT NULL |
| `position` | INTEGER | NOT NULL, DEFAULT 0 |
| `course_id` | BIGINT | NOT NULL, FK → course(id) CASCADE |
| `path` | TEXT | NOT NULL, DEFAULT '' — dot-separated ancestor IDs |
| `lesson_id` | BIGINT | UNIQUE, nullable, FK → lesson(id) CASCADE |
| *(audit fields)* | | |

**Indexes:** `course_id`, `parent_id`, `lesson_id`, `is_item`, `path`

**Note:** Unlike `challenge_node`, `course_node` has an explicit `course_id` FK. Every node belongs to a course (including folder nodes). This allows efficient course-subtree queries.

---

#### `user_course_progress`

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `course_id` | BIGINT | PK part, FK → course(id) CASCADE |
| `started_at` | TIMESTAMPTZ | nullable |
| `completed_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

---

#### `user_lesson_progress`

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `lesson_id` | BIGINT | PK part, FK → lesson(id) CASCADE |
| `started_at` | TIMESTAMPTZ | nullable |
| `completed_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

**Business rule:** Progress is marked complete when user clicks "Complete" (typically after scrolling to bottom of page). `started_at` set on first view.

---

### 3.5 Quiz Domain

#### `quiz_category`

Standard category pattern.

---

#### `quiz`

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `status` | content_status | NOT NULL, DEFAULT 'draft' |
| `category_id` | BIGINT | nullable, FK → quiz_category(id) SET NULL |
| `quiz_point` | INT | DEFAULT 0 |
| `total_questions` | INT | DEFAULT 0 — **denormalized** |
| `time_limit_sec` | INT | nullable — default time limit |
| *(audit fields)* | | |

**Indexes:** `category_id`, `status`, `title`

**Business rule:** `total_questions` is denormalized — synced via Django signal when `quiz_question` is added or deleted.

**Important:** `quiz` does NOT have a direct FK to its `quiz_node`. Access node via reverse relation: `quiz.node` (through `QuizNode.quiz` with `related_name='node'`). This avoids circular FK.

---

#### `quiz_tag` and `quiz_tag_map` (join, CreateAudit only)

Standard tag pattern.

---

#### `quiz_question`
A single question within a quiz.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `quiz_id` | BIGINT | NOT NULL, FK → quiz(id) CASCADE |
| `question_type` | question_type | NOT NULL |
| `status` | content_status | NOT NULL, DEFAULT 'draft' |
| `content` | JSONB | NOT NULL — question body (format varies by type) |
| `explanation` | TEXT | nullable — shown after answering |
| `case_sensitive` | BOOLEAN | DEFAULT FALSE — **only for fill_blank** |
| `score` | INT | DEFAULT 1 |
| `position` | INT | NOT NULL — order within quiz |
| *(audit fields)* | | |

**JSONB content schema by type:**
```json
// single_choice / multi_choice: question text only
{ "text": "What is XSS?" }

// fill_blank: question text only (answers in quiz_question_answer)
{ "text": "The command to list files is ___" }
```

**Business rule:** `case_sensitive` is the **single source of truth** for fill_blank case matching. `quiz_question_answer` does NOT have this field.

---

#### `quiz_question_option`
Answer options for `single_choice` and `multi_choice` questions.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `question_id` | BIGINT | NOT NULL, FK → quiz_question(id) CASCADE |
| `content` | TEXT | NOT NULL |
| `is_correct` | BOOLEAN | DEFAULT FALSE |
| `position` | INT | NOT NULL |
| *(audit fields)* | | |

**Scoring rule:** For `multi_choice`, all correct options must be selected — partial credit not awarded.

---

#### `quiz_question_answer`
Accepted answers for `fill_blank` questions. Multiple accepted answers supported.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `question_id` | BIGINT | NOT NULL, FK → quiz_question(id) CASCADE |
| `answer` | TEXT | NOT NULL |
| *(audit fields)* | | |

---

#### `quiz_node`
Tree node for quiz folder/quiz hierarchy. Extends `BaseNode`.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `parent_id` | BIGINT | nullable, FK → quiz_node(id) CASCADE |
| `path` | TEXT | NOT NULL, DEFAULT '' — dot-separated ancestor IDs |
| `is_item` | BOOLEAN | NOT NULL |
| `position` | INTEGER | NOT NULL, DEFAULT 0 |
| `quiz_id` | BIGINT | UNIQUE, nullable, FK → quiz(id) CASCADE |
| `title` | TEXT | NOT NULL |
| *(audit fields)* | | |

**Indexes:** `parent_id`, `quiz_id`, `path`

---

#### `user_quiz_attempt`
One record per quiz session (attempt).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `quiz_id` | BIGINT | NOT NULL, FK → quiz(id) CASCADE |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `config` | JSONB | nullable — session-specific config snapshot |
| `started_at` | TIMESTAMPTZ | DEFAULT now() |
| `finished_at` | TIMESTAMPTZ | nullable |
| `total_score` | INT | DEFAULT 0 |
| *(audit fields)* | | |

**Indexes:** `quiz_id`, `user_id`, `(user_id, quiz_id, started_at DESC)`

---

#### `user_quiz_answer`
User's answer for one question within one attempt.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `attempt_id` | BIGINT | NOT NULL, FK → user_quiz_attempt(id) CASCADE |
| `question_id` | BIGINT | NOT NULL, FK → quiz_question(id) CASCADE |
| `answer_data` | JSONB | NOT NULL |
| `score_obtained` | INT | DEFAULT 0 |
| | | UNIQUE (`attempt_id`, `question_id`) |

**JSONB `answer_data` schema by type:**
```json
// single_choice
{ "option_id": 42 }

// multi_choice
{ "option_ids": [42, 43] }

// fill_blank
{ "text": "ls" }
```

**Business rule:** Each question can only be answered once per attempt (enforced by UNIQUE constraint).

---

#### `user_quiz_progress`
Aggregate progress per (user, quiz). Updated via Django signal on attempt completion.

| Field | Type | Constraints |
|-------|------|-------------|
| `user_id` | BIGINT | PK part, FK → user(id) CASCADE |
| `quiz_id` | BIGINT | PK part, FK → quiz(id) CASCADE |
| `best_score` | INT | DEFAULT 0 |
| `attempt_count` | INT | DEFAULT 0 |
| `first_attempted_at` | TIMESTAMPTZ | nullable |
| `last_attempted_at` | TIMESTAMPTZ | nullable |
| `completed_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

---

#### `quiz_config`
Per-user per-quiz attempt configuration (persisted, reusable).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `quiz_id` | BIGINT | NOT NULL, FK → quiz(id) CASCADE |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `total_questions` | INT | nullable |
| `time_limit_sec` | INT | nullable |
| `random_question` | BOOLEAN | DEFAULT TRUE |
| `random_option` | BOOLEAN | DEFAULT TRUE |
| `allow_review` | BOOLEAN | DEFAULT TRUE |
| `allow_retry` | BOOLEAN | DEFAULT TRUE |
| `max_attempt` | INT | nullable — NULL = unlimited |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| | | UNIQUE (`quiz_id`, `user_id`) |
| *(audit fields)* | | |

**Business rule:** One config per (user, quiz). Config is saved across sessions.

---

### 3.6 System Domain

#### `system_config`
Runtime key-value configuration store. Primary key is the config key string.

| Field | Type | Constraints |
|-------|------|-------------|
| `key` | VARCHAR(150) | PK |
| `value` | JSONB | NOT NULL |
| `value_type` | config_type | NOT NULL |
| `category` | VARCHAR(50) | NOT NULL |
| `description` | TEXT | nullable |
| `is_runtime` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `is_editable` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| *(audit fields)* | | |

**Indexes:** `category`, `is_runtime`, `is_editable`

**Known system_config keys:**

| Key | Type | Purpose |
|-----|------|---------|

| `outline_base_url` | string | Outline instance base URL |
| `gitlab_base_url` | string | GitLab instance base URL |
| `instance_ttl_seconds` | int | Default TTL for challenge instances |
| `auth_allow_native` | bool | Enable native login/register |
| `auth_allow_sso` | bool | Enable SSO via Authentik |
| `auth_allow_link` | bool | Allow linking multiple auth methods |

---

### 3.7 Notification Domain

#### `notification`

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `title` | TEXT | NOT NULL |
| `body` | TEXT | nullable |
| `payload` | JSONB | nullable — extra data |
| `send_at` | TIMESTAMPTZ | nullable — scheduled send time |
| `is_broadcast` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `notification_type` | notification_type | NOT NULL, DEFAULT 'manual' |
| *(audit fields)* | | |

**Indexes:** `send_at`

---

#### `user_notification`
Delivery record per user per notification.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `notification_id` | BIGINT | NOT NULL, FK → notification(id) CASCADE |
| `user_id` | BIGINT | NOT NULL, FK → user(id) CASCADE |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `read_at` | TIMESTAMPTZ | nullable |
| *(audit fields)* | | |

**Indexes:** `user_id`, `(user_id, is_read)`, `notification_id`

---

### 3.8 Audit Log

#### `audit_log`
Immutable event log for sensitive admin actions.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | BIGSERIAL | PK |
| `actor_id` | BIGINT | nullable, FK → user(id) |
| `event_type` | VARCHAR(100) | NOT NULL — e.g. `role_grant`, `permission_update`, `user_delete` |
| `target_table` | TEXT | nullable |
| `target_id` | BIGINT | nullable |
| `diff` | JSONB | nullable — before/after or metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `actor_id`, `event_type`, `(target_table, target_id)`

**Note:** `audit_log` has no `updated_*` fields — it is append-only.

---

## 4. Cross-Cutting Business Rules

### 4.1 Content Lifecycle
- All content (course, challenge, quiz, lesson, quiz_question) starts as `draft`
- Only `published` content is visible to members
- `archived` content is hidden but preserved; can be re-published
- Lesson `draft` in a `published` course: hidden from members, skipped in progress calculation
- Question `draft` in a `published` quiz: excluded from practice sessions

### 4.2 Permission Resolution Priority
When computing effective permissions for JWT encoding (flat, no hierarchy):
1. Start with all permissions from user's roles (union of all role_permission entries)
2. Apply direct `user_permission` deny overrides (row existence → remove permission from set)
3. Filter out `is_active=FALSE` permissions (endpoint removed from code)
4. Encode result as binary bitmap into `user_permission_cache.encoded_permissions` (base64)
5. Each permission `id` maps to a bit position in the bitmap; bit set = granted

### 4.3 Path Maintenance (Dot-Separated)
- `path` format: dot-separated ancestor IDs (not including self). Root nodes: `path = ""`. Child of node id=1: `path = "1"`. Deep node: `path = "1.3.10"`
- On **node create**: `path = parent.path + "." + str(parent.id)` (if parent exists, else `""`)
- On **node move**: update self AND all descendant `path` values
- **Depth** = 0 if `path == ""`, else `path.count('.') + 1`
- **Lazy loading**: load direct children via `filter(parent_id=X)` — no subtree prefix query needed for normal operations
- **Subtree queries** (rare, e.g., move validation): `filter(path__startswith=node.path + "." + str(node.id))` — still works but not the primary access pattern

### 4.4 Denormalized Counters (must sync via Django signals — no DB triggers)
| Counter field | Trigger |
|---------------|---------|
| `user_profile.total_*_point` | When progress completed |
| `user_profile.*_completed` | When course/challenge/quiz marked complete |
| `quiz.total_questions` | When quiz_question added/deleted (only count `status=published`) |
| `user_quiz_progress.best_score`, `attempt_count` | When user_quiz_attempt saved |

**Note:** All denormalized field updates are done at **application level** via Django signals or explicit service method calls. **No DB triggers** are used in this project.

### 4.5 Security Invariants
- **Never** store plaintext refresh tokens — always hash (e.g., SHA-256) before storing in `user_session.refresh_token_hash`
- **Never** expose flag values to client — all flag checking is server-side
- **Never** return flag solutions from AI assistant (`learn_assistant` mode enforces this)
- External service base URLs (Outline, GitLab) live in `system_config` — never hardcoded in per-record fields

---

## 5. ORM Abstract Base Models

All in `backend/api/models.py`:

| Abstract model | Fields added | Usage |
|----------------|-------------|-------|
| `CreateAudit` | `created_at`, `created_by` | Join tables |
| `UpdateAudit` | `updated_at`, `updated_by` | (rare standalone) |
| `FullAudit(CreateAudit, UpdateAudit)` | all 4 audit fields | All domain entities |
| `SoftDeleteAudit` | `deleted_at`, `deleted_by`, `is_deleted` property | (not yet used in v3 schema) |
| `BaseNode(FullAudit)` | `parent`, `is_item`, `title`, `path`, `position` | All tree nodes |
| `BaseCategory(FullAudit)` | `name` (unique), `description` | All category models |
| `BaseTag(FullAudit)` | `name` (unique), `description` | All tag models |

---

## 6. Planned / Future Schema Changes

Items noted in schema but deferred:

| Item | Note |
|------|------|
| `user_point_log` | Per-event point history (planned for later version) |
