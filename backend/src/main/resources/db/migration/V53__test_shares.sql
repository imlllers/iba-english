ALTER TABLE tests
    ADD COLUMN IF NOT EXISTS listed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS shared_from_name VARCHAR(200);

CREATE TABLE test_shares (
    id UUID PRIMARY KEY,
    source_test_id UUID REFERENCES tests (id) ON DELETE SET NULL,
    snapshot_test_id UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    CONSTRAINT chk_test_shares_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))
);

CREATE INDEX idx_test_shares_recipient_status ON test_shares (recipient_id, status);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSONB;