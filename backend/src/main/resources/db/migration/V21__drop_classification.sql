UPDATE questions
SET type = 'MATCHING'
WHERE type = 'CLASSIFICATION';

UPDATE test_versions
SET content_snapshot = replace(content_snapshot::text, '"type":"CLASSIFICATION"', '"type":"MATCHING"')::jsonb
WHERE content_snapshot::text LIKE '%CLASSIFICATION%';

UPDATE test_versions
SET content_snapshot = replace(content_snapshot::text, '"type": "CLASSIFICATION"', '"type": "MATCHING"')::jsonb
WHERE content_snapshot::text LIKE '%CLASSIFICATION%';
