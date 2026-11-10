ALTER TABLE tests ADD COLUMN public_token_expires_at TIMESTAMPTZ;

UPDATE tests
SET public_token_expires_at = now() + interval '12 hours'
WHERE public_token IS NOT NULL;
