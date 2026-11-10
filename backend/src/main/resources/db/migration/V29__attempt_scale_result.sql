ALTER TABLE test_attempts
    ADD COLUMN scale_result JSONB,
    ADD COLUMN scale_manual JSONB,
    ADD COLUMN scale_level VARCHAR(40),
    ADD COLUMN result_emailed_at TIMESTAMPTZ;
