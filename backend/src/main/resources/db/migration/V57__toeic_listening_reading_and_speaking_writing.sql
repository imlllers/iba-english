UPDATE exam_templates
SET title = 'TOEIC Listening & Reading'
WHERE builtin_key = 'TOEIC'
  AND title = 'TOEIC';

UPDATE exam_templates
SET default_settings = (default_settings - 'timeLimitMinutes' - 'timeLimitSectionTypes')
    || jsonb_build_object(
        'resultDetail', 'score_and_scale',
        'audioAutoStart', true,
        'videoAutoStart', true,
        'allowBackToSection', false,
        'focusLossMaxWarnings', 2,
        'allowEarlySubmit', true,
        'showResultToParticipant', true
    )
WHERE builtin_key = 'TOEIC';

UPDATE exam_templates t
SET sections = (
    SELECT COALESCE(jsonb_agg(s ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
    WHERE COALESCE(s ->> 'sectionType', '') NOT IN ('SPEAKING', 'WRITING')
       OR NOT (
           jsonb_array_length(COALESCE(s -> 'parts', '[]'::jsonb)) = 0
           AND jsonb_array_length(COALESCE(s -> 'items', '[]'::jsonb)) = 0
           AND jsonb_array_length(COALESCE(s -> 'questions', '[]'::jsonb)) = 0
       )
)
WHERE builtin_key = 'TOEIC'
  AND jsonb_typeof(t.sections) = 'array';

UPDATE exam_templates t
SET sections = (
    SELECT COALESCE(jsonb_agg(adjusted ORDER BY
           CASE adjusted ->> 'sectionType'
             WHEN 'LISTENING' THEN 1
             WHEN 'READING' THEN 2
             ELSE 5
           END, ord), '[]'::jsonb)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
    CROSS JOIN LATERAL (
        SELECT CASE s ->> 'sectionType'
            WHEN 'LISTENING' THEN jsonb_set(jsonb_set(jsonb_set(
                CASE WHEN jsonb_typeof(s -> 'parts') = 'array' THEN
                    jsonb_set(s, '{parts}', COALESCE((
                        SELECT jsonb_agg(
                                   CASE p ->> 'title'
                                       WHEN 'Part 1: Photographs' THEN jsonb_set(p, '{oneQuestionPerPage}', 'true'::jsonb)
                                       WHEN 'Part 2: Question-Response' THEN jsonb_set(p, '{oneQuestionPerPage}', 'true'::jsonb)
                                       WHEN 'Part 3: Conversations' THEN jsonb_set(p, '{oneQuestionPerPage}', 'false'::jsonb)
                                       WHEN 'Part 4: Talks' THEN jsonb_set(p, '{oneQuestionPerPage}', 'false'::jsonb)
                                       ELSE p
                                   END
                                   ORDER BY pord)
                        FROM jsonb_array_elements(s -> 'parts') WITH ORDINALITY AS pe(p, pord)
                    ), '[]'::jsonb))
                ELSE s END,
                '{timeLimitMinutes}', '45'::jsonb),
                '{allowBackToQuestions}', 'false'::jsonb),
                '{allowBackToPart}', 'false'::jsonb)
            WHEN 'READING' THEN jsonb_set(jsonb_set(jsonb_set(
                CASE WHEN jsonb_typeof(s -> 'parts') = 'array' THEN
                    jsonb_set(s, '{parts}', COALESCE((
                        SELECT jsonb_agg(
                                   CASE p ->> 'title'
                                       WHEN 'Part 5: Incomplete Sentences' THEN jsonb_set(p, '{oneQuestionPerPage}', 'true'::jsonb)
                                       WHEN 'Part 6: Text Completion' THEN jsonb_set(p, '{oneQuestionPerPage}', 'false'::jsonb)
                                       WHEN 'Part 7: Reading Comprehension' THEN jsonb_set(p, '{oneQuestionPerPage}', 'false'::jsonb)
                                       ELSE p
                                   END
                                   ORDER BY pord)
                        FROM jsonb_array_elements(s -> 'parts') WITH ORDINALITY AS pe(p, pord)
                    ), '[]'::jsonb))
                ELSE s END,
                '{timeLimitMinutes}', '75'::jsonb),
                '{allowBackToQuestions}', 'true'::jsonb),
                '{allowBackToPart}', 'true'::jsonb)
            ELSE s
        END AS adjusted
    ) x
)
WHERE builtin_key = 'TOEIC'
  AND jsonb_typeof(t.sections) = 'array';

INSERT INTO exam_templates (
    id,
    owner_id,
    title,
    family,
    builtin_key,
    sections,
    default_settings,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    owners.owner_id,
    'TOEIC Speaking & Writing',
    'TOEIC',
    'TOEIC_SW',
    '[
      {
        "title": "Speaking Section",
        "sectionType": "SPEAKING",
        "timeLimitMinutes": 20,
        "instructions": "",
        "allowBackToQuestions": false,
        "allowBackToPart": false,
        "parts": []
      },
      {
        "title": "Writing Section",
        "sectionType": "WRITING",
        "timeLimitMinutes": 60,
        "instructions": "",
        "allowBackToQuestions": false,
        "allowBackToPart": false,
        "parts": []
      }
    ]'::jsonb,
    jsonb_build_object(
        'examType', 'TOEIC',
        'questionNumberScope', 'test',
        'oneQuestionPerPage', true,
        'allowBackToQuestions', true,
        'allowBackToPart', true,
        'allowBackToSection', false,
        'audioAutoStart', true,
        'videoAutoStart', true,
        'shuffleChoices', false,
        'showResultToParticipant', true,
        'resultDetail', 'score_and_scale',
        'focusLossMaxWarnings', 2,
        'allowEarlySubmit', true,
        'requireParticipantName', true,
        'requireParticipantEmail', true,
        'scoreScale', jsonb_build_object(
            'sourceId', 'toeic_sw',
            'scale', '{
              "id": "toeic_sw",
              "title": "TOEIC Speaking & Writing",
              "examType": "TOEIC",
              "aggregate": "sum",
              "round": {"step": null, "mode": "nearest"},
              "sections": [
                {
                  "name": "Speaking",
                  "sectionType": "SPEAKING",
                  "min": 0,
                  "max": 200,
                  "step": 10,
                  "convert": {"method": "manual"}
                },
                {
                  "name": "Writing",
                  "sectionType": "WRITING",
                  "min": 0,
                  "max": 200,
                  "step": 10,
                  "convert": {"method": "manual"}
                }
              ],
              "levels": []
            }'::jsonb,
            'sections', jsonb_build_array(
                jsonb_build_object('sectionIndex', 0),
                jsonb_build_object('sectionIndex', 1)
            )
        )
    ),
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT owner_id
    FROM exam_templates
) owners
WHERE NOT EXISTS (
    SELECT 1
    FROM exam_templates existing
    WHERE existing.owner_id = owners.owner_id
      AND existing.builtin_key = 'TOEIC_SW'
);