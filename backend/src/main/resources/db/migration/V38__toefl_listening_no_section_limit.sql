UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(
               CASE WHEN s ->> 'sectionType' = 'LISTENING' THEN jsonb_set(s, '{timeLimitMinutes}', 'null') ELSE s END
               ORDER BY ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
)
WHERE (t.family = 'TOEFL' OR t.default_settings ->> 'examType' = 'TOEFL')
  AND jsonb_typeof(t.sections) = 'array'
  AND jsonb_array_length(t.sections) > 0;

UPDATE test_sections s
SET time_limit_minutes = NULL
FROM tests t
WHERE s.test_id = t.id
  AND s.section_type = 'LISTENING'
  AND (t.settings ->> 'examType' = 'TOEFL'
       OR (COALESCE(t.settings ->> 'examType', '') = '' AND t.exam_preset = 'TOEFL'));

UPDATE section_parts p
SET time_limit_minutes = NULL
FROM test_sections s
JOIN tests t ON t.id = s.test_id
WHERE p.section_id = s.id
  AND s.section_type = 'LISTENING'
  AND (t.settings ->> 'examType' = 'TOEFL'
       OR (COALESCE(t.settings ->> 'examType', '') = '' AND t.exam_preset = 'TOEFL'));

UPDATE test_versions v
SET content_snapshot = jsonb_set(v.content_snapshot, '{sections}', (
    SELECT jsonb_agg(
               CASE WHEN s ->> 'sectionType' = 'LISTENING' THEN
                   jsonb_set(
                       jsonb_set(s, '{timeLimitMinutes}', 'null'),
                       '{parts}',
                       COALESCE((
                           SELECT jsonb_agg(jsonb_set(p, '{timeLimitMinutes}', 'null') ORDER BY pord)
                           FROM jsonb_array_elements(COALESCE(s -> 'parts', '[]'::jsonb)) WITH ORDINALITY AS pe(p, pord)
                       ), '[]'::jsonb))
               ELSE s END
               ORDER BY ord)
    FROM jsonb_array_elements(v.content_snapshot -> 'sections') WITH ORDINALITY AS e(s, ord)
))
FROM tests t
WHERE v.test_id = t.id
  AND jsonb_typeof(v.content_snapshot -> 'sections') = 'array'
  AND jsonb_array_length(v.content_snapshot -> 'sections') > 0
  AND (v.settings_snapshot ->> 'examType' = 'TOEFL'
       OR (COALESCE(v.settings_snapshot ->> 'examType', '') = '' AND t.exam_preset = 'TOEFL'));
