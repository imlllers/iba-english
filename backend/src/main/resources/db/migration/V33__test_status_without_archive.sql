UPDATE tests SET status = 'PUBLISHED'
WHERE status <> 'PUBLISHED'
  AND EXISTS (SELECT 1 FROM test_versions v WHERE v.test_id = tests.id);

UPDATE tests SET status = 'DRAFT' WHERE status = 'ARCHIVED';
