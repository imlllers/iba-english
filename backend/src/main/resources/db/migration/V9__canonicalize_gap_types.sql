UPDATE questions
SET type = CASE type
    WHEN 'TABLE_COMPLETION' THEN 'FILL_BLANKS'
    WHEN 'FORM_COMPLETION' THEN 'FILL_BLANKS'
    WHEN 'NOTE_COMPLETION' THEN 'FILL_BLANKS'
    WHEN 'MISSING_LETTERS' THEN 'FILL_BLANKS'
    WHEN 'DRAG_DROP_GAPS' THEN 'WORD_BANK_GAPS'
    ELSE type
END
WHERE type IN (
    'TABLE_COMPLETION',
    'FORM_COMPLETION',
    'NOTE_COMPLETION',
    'MISSING_LETTERS',
    'DRAG_DROP_GAPS'
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
                                'TABLE_COMPLETION',
                                'FORM_COMPLETION',
                                'NOTE_COMPLETION',
                                'MISSING_LETTERS'
                            ) THEN jsonb_set(question, '{type}', '"FILL_BLANKS"')
                            WHEN question ->> 'type' = 'DRAG_DROP_GAPS'
                                THEN jsonb_set(question, '{type}', '"WORD_BANK_GAPS"')
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
