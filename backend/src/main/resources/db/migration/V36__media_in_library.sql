ALTER TABLE media_assets ADD COLUMN in_library BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE media_assets SET in_library = FALSE WHERE deleted_at IS NOT NULL;
ALTER TABLE media_assets DROP COLUMN deleted_at;
