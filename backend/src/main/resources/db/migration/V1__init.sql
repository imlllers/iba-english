CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ
);

CREATE TABLE tests (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users (id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    language VARCHAR(16) NOT NULL,
    exam_preset VARCHAR(40),
    status VARCHAR(20) NOT NULL,
    public_token VARCHAR(80) UNIQUE,
    settings JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX tests_owner_idx ON tests (owner_id);
CREATE INDEX tests_status_idx ON tests (status);

CREATE TABLE test_sections (
    id UUID PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    order_index INTEGER NOT NULL,
    section_type VARCHAR(40) NOT NULL,
    time_limit_minutes INTEGER
);

CREATE INDEX test_sections_test_idx ON test_sections (test_id, order_index);

CREATE TABLE questions (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES test_sections (id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    prompt_content JSONB NOT NULL,
    options JSONB NOT NULL,
    answer_key JSONB NOT NULL,
    scoring_config JSONB NOT NULL,
    order_index INTEGER NOT NULL,
    required BOOLEAN NOT NULL,
    settings JSONB NOT NULL
);

CREATE INDEX questions_section_idx ON questions (section_id, order_index);

CREATE TABLE test_versions (
    id UUID PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_snapshot JSONB NOT NULL,
    settings_snapshot JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    UNIQUE (test_id, version_number)
);

CREATE TABLE test_attempts (
    id UUID PRIMARY KEY,
    test_version_id UUID NOT NULL REFERENCES test_versions (id),
    participant_name VARCHAR(120),
    access_token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    score NUMERIC(10, 2),
    max_score NUMERIC(10, 2),
    progress JSONB NOT NULL
);

CREATE INDEX test_attempts_version_idx ON test_attempts (test_version_id);

CREATE TABLE answers (
    id UUID PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES test_attempts (id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    answer_data JSONB NOT NULL,
    awarded_score NUMERIC(10, 2),
    max_score NUMERIC(10, 2),
    feedback TEXT,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    criterion_scores JSONB,
    reviewed_by UUID REFERENCES users (id),
    reviewed_at TIMESTAMPTZ,
    UNIQUE (attempt_id, question_id)
);

CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users (id),
    attempt_id UUID REFERENCES test_attempts (id) ON DELETE CASCADE,
    storage_key VARCHAR(80) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX media_assets_owner_idx ON media_assets (owner_id);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users (id),
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(40),
    target_id UUID,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX audit_events_created_idx ON audit_events (created_at DESC);

CREATE TABLE platform_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
