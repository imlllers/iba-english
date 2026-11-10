ALTER TABLE test_sections
    ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE section_parts
    ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
