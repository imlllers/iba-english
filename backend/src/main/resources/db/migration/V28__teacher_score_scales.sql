CREATE TABLE teacher_score_scales (
    owner_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    scales JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

DELETE FROM platform_settings WHERE setting_key = 'cefrScales';
