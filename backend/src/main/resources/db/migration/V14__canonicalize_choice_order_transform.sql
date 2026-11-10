UPDATE questions
SET type = CASE type
    WHEN 'HEADING_CHOICE' THEN 'SINGLE_CHOICE'
    WHEN 'BUILD_SENTENCE' THEN 'ORDER_SENTENCES'
    WHEN 'PARAPHRASE' THEN 'SENTENCE_TRANSFORMATION'
    WHEN 'ERROR_CORRECTION' THEN 'SENTENCE_TRANSFORMATION'
    ELSE type
END
WHERE type IN (
    'HEADING_CHOICE',
    'BUILD_SENTENCE',
    'PARAPHRASE',
    'ERROR_CORRECTION'
);

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
                            WHEN question ->> 'type' = 'HEADING_CHOICE'
                                THEN jsonb_set(question, '{type}', '"SINGLE_CHOICE"')
                            WHEN question ->> 'type' = 'BUILD_SENTENCE'
                                THEN jsonb_set(question, '{type}', '"ORDER_SENTENCES"')
                            WHEN question ->> 'type' IN ('PARAPHRASE', 'ERROR_CORRECTION')
                                THEN jsonb_set(question, '{type}', '"SENTENCE_TRANSFORMATION"')
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
