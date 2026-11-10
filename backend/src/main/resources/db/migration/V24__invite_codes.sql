CREATE TABLE invite_codes (
    id UUID PRIMARY KEY,
    code_hash VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users (id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES users (id),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX invite_codes_active_idx ON invite_codes (expires_at)
    WHERE used_at IS NULL AND revoked_at IS NULL;
