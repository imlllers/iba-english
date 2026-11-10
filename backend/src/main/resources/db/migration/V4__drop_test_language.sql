ALTER TABLE tests DROP COLUMN language;

UPDATE test_versions
SET content_snapshot = content_snapshot - 'language'
WHERE content_snapshot ? 'language';
