UPDATE questions
SET type = CASE type
    WHEN 'LOCATE_IN_TEXT' THEN 'SENTENCE_INSERTION'
    WHEN 'ORDER_PARAGRAPHS' THEN 'ORDER_SENTENCES'
    ELSE type
END
WHERE type IN ('LOCATE_IN_TEXT', 'ORDER_PARAGRAPHS');

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
                            WHEN question ->> 'type' = 'LOCATE_IN_TEXT'
                                THEN jsonb_set(question, '{type}', '"SENTENCE_INSERTION"')
                            WHEN question ->> 'type' = 'ORDER_PARAGRAPHS'
                                THEN jsonb_set(question, '{type}', '"ORDER_SENTENCES"')
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
