UPDATE section_parts p
SET one_question_per_page = NULL
FROM test_sections s
JOIN tests t ON t.id = s.test_id
WHERE p.section_id = s.id
  AND p.one_question_per_page IS NOT NULL
  AND p.one_question_per_page = COALESCE((t.settings ->> 'oneQuestionPerPage')::boolean, TRUE);

UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(
               CASE WHEN jsonb_typeof(s -> 'parts') = 'array' THEN
                   jsonb_set(s, '{parts}', (
                       SELECT COALESCE(jsonb_agg(
                                  CASE WHEN jsonb_typeof(p -> 'oneQuestionPerPage') = 'boolean'
                                            AND (p ->> 'oneQuestionPerPage')::boolean
                                                = COALESCE((t.default_settings ->> 'oneQuestionPerPage')::boolean, TRUE)
                                       THEN jsonb_set(p, '{oneQuestionPerPage}', 'null')
                                       ELSE p END
                                  ORDER BY pord), '[]'::jsonb)
                       FROM jsonb_array_elements(s -> 'parts') WITH ORDINALITY AS pe(p, pord)
                   ))
               ELSE s END
               ORDER BY ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
)
WHERE jsonb_typeof(t.sections) = 'array'
  AND jsonb_array_length(t.sections) > 0;
