UPDATE questions
SET type = 'SINGLE_CHOICE'
WHERE type = 'FRAGMENT_CHOICE';

UPDATE test_versions
SET content_snapshot = jsonb_set(
    content_snapshot,
    '{sections}',
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_set(
                section,
                '{questions}',
                (
                    SELECT COALESCE(jsonb_agg(
                        CASE
                            WHEN question ->> 'type' = 'FRAGMENT_CHOICE'
                                THEN jsonb_set(question, '{type}', '"SINGLE_CHOICE"')
                            ELSE question
                        END
                        ORDER BY question_index
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(section -> 'questions', '[]'::jsonb))
                        WITH ORDINALITY AS questions(question, question_index)
                )
            )
            ORDER BY section_index
        ), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(content_snapshot -> 'sections', '[]'::jsonb))
            WITH ORDINALITY AS sections(section, section_index)
    )
)
WHERE jsonb_typeof(content_snapshot -> 'sections') = 'array';
