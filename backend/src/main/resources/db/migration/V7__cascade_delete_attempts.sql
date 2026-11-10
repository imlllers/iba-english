ALTER TABLE test_attempts
    DROP CONSTRAINT IF EXISTS test_attempts_test_version_id_fkey;

ALTER TABLE test_attempts
    ADD CONSTRAINT test_attempts_test_version_id_fkey
        FOREIGN KEY (test_version_id) REFERENCES test_versions (id) ON DELETE CASCADE;
