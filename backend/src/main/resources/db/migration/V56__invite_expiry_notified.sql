ALTER TABLE invite_codes ADD COLUMN expiry_notified_at TIMESTAMPTZ;

UPDATE invite_codes
SET expiry_notified_at = now()
WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at <= now();