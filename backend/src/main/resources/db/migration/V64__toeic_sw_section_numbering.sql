UPDATE exam_templates
SET default_settings = jsonb_set(default_settings, '{questionNumberScope}', '"section"')
WHERE builtin_key = 'TOEIC_SW';

UPDATE tests
SET settings = jsonb_set(settings, '{questionNumberScope}', '"section"')
WHERE exam_preset = 'TOEIC_SW';

UPDATE test_versions v
SET settings_snapshot = jsonb_set(v.settings_snapshot, '{questionNumberScope}', '"section"')
FROM tests t
WHERE v.test_id = t.id
  AND t.exam_preset = 'TOEIC_SW';