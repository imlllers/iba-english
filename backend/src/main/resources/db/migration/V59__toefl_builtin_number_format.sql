UPDATE exam_templates
SET default_settings = jsonb_set(default_settings, '{questionNumberFormat}', '"1."')
WHERE builtin_key = 'TOEFL';