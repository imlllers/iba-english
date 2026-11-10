DELETE FROM answers
WHERE question_id IN (SELECT id FROM questions WHERE type = 'AUDIO_QUESTIONS');

DELETE FROM questions WHERE type = 'AUDIO_QUESTIONS';

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
                    SELECT COALESCE(jsonb_agg(question ORDER BY question_index), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(section -> 'questions', '[]'::jsonb))
                        WITH ORDINALITY AS questions(question, question_index)
                    WHERE question ->> 'type' IS DISTINCT FROM 'AUDIO_QUESTIONS'
                )
            )
            ORDER BY section_index
        ), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(content_snapshot -> 'sections', '[]'::jsonb))
            WITH ORDINALITY AS sections(section, section_index)
    )
)
WHERE jsonb_typeof(content_snapshot -> 'sections') = 'array';
