CREATE TABLE exam_templates (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    family VARCHAR(20) NOT NULL,
    builtin_key VARCHAR(20),
    sections JSONB NOT NULL,
    default_settings JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX exam_templates_owner_builtin_uidx
    ON exam_templates (owner_id, builtin_key)
    WHERE builtin_key IS NOT NULL;

CREATE INDEX exam_templates_owner_idx ON exam_templates (owner_id);
