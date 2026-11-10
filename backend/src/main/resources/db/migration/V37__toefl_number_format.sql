UPDATE exam_templates
SET default_settings = jsonb_set(default_settings, '{questionNumberFormat}', '"1."')
WHERE family = 'TOEFL' OR default_settings ->> 'examType' = 'TOEFL';

UPDATE tests
SET settings = jsonb_set(settings, '{questionNumberFormat}', '"1."')
WHERE settings ->> 'examType' = 'TOEFL'
   OR (COALESCE(settings ->> 'examType', '') = '' AND exam_preset = 'TOEFL');

UPDATE test_versions v
SET settings_snapshot = jsonb_set(v.settings_snapshot, '{questionNumberFormat}', '"1."')
FROM tests t
WHERE v.test_id = t.id
  AND (v.settings_snapshot ->> 'examType' = 'TOEFL'
       OR (COALESCE(v.settings_snapshot ->> 'examType', '') = '' AND t.exam_preset = 'TOEFL'));
