ALTER TABLE test_shares DROP CONSTRAINT IF EXISTS test_shares_snapshot_test_id_fkey;

ALTER TABLE test_shares ALTER COLUMN snapshot_test_id DROP NOT NULL;

ALTER TABLE test_shares
    ADD CONSTRAINT test_shares_snapshot_test_id_fkey
        FOREIGN KEY (snapshot_test_id) REFERENCES tests (id) ON DELETE SET NULL;
