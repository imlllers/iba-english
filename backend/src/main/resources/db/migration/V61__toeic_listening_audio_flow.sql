UPDATE exam_templates
SET default_settings = COALESCE(default_settings, '{}'::jsonb) || jsonb_build_object('autoAdvanceOnQuestionTimeout', true)
WHERE builtin_key = 'TOEIC';

UPDATE exam_templates t
SET sections = (
    SELECT COALESCE(jsonb_agg(adjusted ORDER BY e.ord), '[]'::jsonb)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
    CROSS JOIN LATERAL (
        SELECT CASE
            WHEN s ->> 'sectionType' = 'LISTENING' THEN
                jsonb_set(
                    CASE WHEN s ? 'timeLimitSeconds' THEN jsonb_set(s, '{timeLimitSeconds}', 'null'::jsonb, true) ELSE s END,
                    '{timeLimitMinutes}',
                    'null'::jsonb)
            ELSE s
        END AS adjusted
    ) x
)
WHERE builtin_key = 'TOEIC'
  AND jsonb_typeof(t.sections) = 'array';

UPDATE tests t
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('autoAdvanceOnQuestionTimeout', true)
WHERE settings ->> 'examType' = 'TOEIC'
  AND EXISTS (
      SELECT 1
      FROM test_sections ts
      WHERE ts.test_id = t.id AND ts.section_type = 'LISTENING'
  );

UPDATE test_sections ts
SET time_limit_minutes = NULL,
    time_limit_seconds = NULL
FROM tests t
WHERE ts.test_id = t.id
  AND ts.section_type = 'LISTENING'
  AND t.settings ->> 'examType' = 'TOEIC';