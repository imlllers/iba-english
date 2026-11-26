UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(adjusted ORDER BY ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
    CROSS JOIN LATERAL (
        SELECT CASE
            WHEN s ->> 'sectionType' = 'SPEAKING'
                 AND jsonb_array_length(COALESCE(s -> 'parts', '[]'::jsonb)) = 0
            THEN jsonb_set(
                s,
                '{parts}',
                jsonb_build_array(
                    jsonb_build_object(
                        'title', 'Questions 1-2: Read a Text Aloud',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Questions 3-4: Describe a Picture',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Questions 5-7: Respond to Questions',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Questions 8-10: Respond to Questions Using Information Provided',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Question 11: Express an Opinion',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    )
                )
            )
            WHEN s ->> 'sectionType' = 'WRITING'
                 AND jsonb_array_length(COALESCE(s -> 'parts', '[]'::jsonb)) = 0
            THEN jsonb_set(
                s,
                '{parts}',
                jsonb_build_array(
                    jsonb_build_object(
                        'title', 'Questions 1-5: Write a Sentence Based on a Picture',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Questions 6-7: Respond to a Written Request',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    ),
                    jsonb_build_object(
                        'title', 'Question 8: Write an Opinion Essay',
                        'timeLimitMinutes', NULL,
                        'timeLimitSeconds', NULL,
                        'oneQuestionPerPage', true,
                        'autoAdvanceOnTimeout', NULL
                    )
                )
            )
            ELSE s
        END AS adjusted
    ) x
),
updated_at = NOW()
WHERE builtin_key = 'TOEIC_SW'
  AND jsonb_typeof(t.sections) = 'array';