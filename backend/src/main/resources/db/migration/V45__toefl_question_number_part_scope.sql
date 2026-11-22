UPDATE exam_templates
SET default_settings = jsonb_set(default_settings, '{questionNumberScope}', '"part"')
WHERE family = 'TOEFL'
   OR default_settings ->> 'examType' = 'TOEFL'
   OR builtin_key IN ('TOEFL', 'TOEFL_LEGACY');

UPDATE tests
SET settings = jsonb_set(settings, '{questionNumberScope}', '"part"')
WHERE settings ->> 'examType' = 'TOEFL'
   OR (COALESCE(settings ->> 'examType', '') = '' AND exam_preset IN ('TOEFL', 'TOEFL_LEGACY'));

UPDATE test_versions v
SET settings_snapshot = jsonb_set(v.settings_snapshot, '{questionNumberScope}', '"part"')
FROM tests t
WHERE v.test_id = t.id
  AND (v.settings_snapshot ->> 'examType' = 'TOEFL'
       OR (COALESCE(v.settings_snapshot ->> 'examType', '') = '' AND t.exam_preset IN ('TOEFL', 'TOEFL_LEGACY')));