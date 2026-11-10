UPDATE questions
SET type = 'MATCHING'
WHERE type IN (
    'MATCH_ENDINGS',
    'MATCH_QA',
    'MATCH_SPEAKERS',
    'MATCH_HEADINGS',
    'MATCH_DESCRIPTIONS',
    'MATCH_AUDIO'
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
                            WHEN question ->> 'type' IN (
                                'MATCH_ENDINGS',
                                'MATCH_QA',
                                'MATCH_SPEAKERS',
                                'MATCH_HEADINGS',
                                'MATCH_DESCRIPTIONS',
                                'MATCH_AUDIO'
                            ) THEN jsonb_set(question, '{type}', '"MATCHING"')
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
