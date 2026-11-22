ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE test_sections
    ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER;