UPDATE exam_templates
SET default_settings = jsonb_set(default_settings, '{audioAutoStart}', 'true'::jsonb)
WHERE builtin_key = 'IELTS';

UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(
               CASE WHEN s ->> 'sectionType' = 'WRITING' THEN
                   jsonb_set(
                       s,
                       '{parts}',
                       COALESCE((
                           SELECT jsonb_agg(jsonb_set(p, '{timeLimitMinutes}', 'null'::jsonb) ORDER BY pord)
                           FROM jsonb_array_elements(COALESCE(s -> 'parts', '[]'::jsonb)) WITH ORDINALITY AS pe(p, pord)
                       ), '[]'::jsonb)
                   )
               ELSE s END
               ORDER BY ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
)
WHERE builtin_key = 'IELTS'
  AND jsonb_typeof(t.sections) = 'array';

UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(
               CASE WHEN s ->> 'sectionType' = 'READING' THEN
                   jsonb_set(jsonb_set(s, '{allowBackToQuestions}', 'true'::jsonb),
                             '{allowBackToPart}', 'true'::jsonb)
               ELSE s END
               ORDER BY ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
)
WHERE builtin_key = 'TOEFL'
  AND jsonb_typeof(t.sections) = 'array';

UPDATE exam_templates
SET default_settings = jsonb_set(
    default_settings,
    '{scoreScale,scale}',
    '{
      "id": "toefl",
      "title": "TOEFL iBT",
      "examType": "TOEFL",
      "aggregate": "average",
      "round": {"step": 0.5, "mode": "nearest"},
      "sections": [
        {
          "name": "Reading",
          "sectionType": "READING",
          "min": 1,
          "max": 6,
          "step": 0.5,
          "convert": {
            "method": "table",
            "rawMax": 30,
            "table": [
              {"from":0,"to":1,"score":1},
              {"from":2,"to":4,"score":1.5},
              {"from":5,"to":7,"score":2},
              {"from":8,"to":10,"score":2.5},
              {"from":11,"to":13,"score":3},
              {"from":14,"to":16,"score":3.5},
              {"from":17,"to":19,"score":4},
              {"from":20,"to":22,"score":4.5},
              {"from":23,"to":25,"score":5},
              {"from":26,"to":28,"score":5.5},
              {"from":29,"to":30,"score":6}
            ]
          }
        },
        {
          "name": "Listening",
          "sectionType": "LISTENING",
          "min": 1,
          "max": 6,
          "step": 0.5,
          "convert": {
            "method": "table",
            "rawMax": 30,
            "table": [
              {"from":0,"to":1,"score":1},
              {"from":2,"to":4,"score":1.5},
              {"from":5,"to":7,"score":2},
              {"from":8,"to":10,"score":2.5},
              {"from":11,"to":13,"score":3},
              {"from":14,"to":16,"score":3.5},
              {"from":17,"to":19,"score":4},
              {"from":20,"to":22,"score":4.5},
              {"from":23,"to":25,"score":5},
              {"from":26,"to":28,"score":5.5},
              {"from":29,"to":30,"score":6}
            ]
          }
        },
        {
          "name": "Writing",
          "sectionType": "WRITING",
          "min": 1,
          "max": 6,
          "step": 0.5,
          "convert": {"method": "manual"}
        },
        {
          "name": "Speaking",
          "sectionType": "SPEAKING",
          "min": 1,
          "max": 6,
          "step": 0.5,
          "convert": {"method": "manual"}
        }
      ],
      "levels": [
        {"label":"A1","min":1,"max":1.5},
        {"label":"A2","min":2,"max":2.5},
        {"label":"B1","min":3,"max":3.5},
        {"label":"B2","min":4,"max":4.5},
        {"label":"C1","min":5,"max":5.5},
        {"label":"C2","min":6,"max":6}
      ]
    }'::jsonb
)
WHERE builtin_key = 'TOEFL'
  AND default_settings #>> '{scoreScale,scale,id}' = 'toefl';

UPDATE exam_templates
SET default_settings = (default_settings - 'timeLimitMinutes' - 'timeLimitSectionTypes')
                       || jsonb_build_object('audioAutoStart', true)
WHERE builtin_key = 'TOEIC';

UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(adjusted ORDER BY
           CASE adjusted ->> 'sectionType'
             WHEN 'LISTENING' THEN 1
             WHEN 'READING' THEN 2
             WHEN 'SPEAKING' THEN 3
             WHEN 'WRITING' THEN 4
             ELSE 5
           END, ord)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
    CROSS JOIN LATERAL (
        SELECT CASE s ->> 'sectionType'
            WHEN 'LISTENING' THEN jsonb_set(jsonb_set(jsonb_set(s, '{timeLimitMinutes}', '45'::jsonb),
                                        '{allowBackToQuestions}', 'false'::jsonb),
                                        '{allowBackToPart}', 'false'::jsonb)
            WHEN 'READING' THEN jsonb_set(jsonb_set(jsonb_set(s, '{timeLimitMinutes}', '75'::jsonb),
                                      '{allowBackToQuestions}', 'true'::jsonb),
                                      '{allowBackToPart}', 'true'::jsonb)
            WHEN 'SPEAKING' THEN jsonb_set(jsonb_set(jsonb_set(s, '{timeLimitMinutes}', '20'::jsonb),
                                       '{allowBackToQuestions}', 'false'::jsonb),
                                       '{allowBackToPart}', 'false'::jsonb)
            WHEN 'WRITING' THEN jsonb_set(jsonb_set(jsonb_set(s, '{timeLimitMinutes}', '60'::jsonb),
                                      '{allowBackToQuestions}', 'false'::jsonb),
                                      '{allowBackToPart}', 'false'::jsonb)
            ELSE s
        END AS adjusted
    ) x
)
WHERE builtin_key = 'TOEIC'
  AND jsonb_typeof(t.sections) = 'array';

UPDATE exam_templates
SET default_settings = jsonb_set(
  default_settings,
  '{scoreScale,scale,levels}',
  '[{"label":"A1","min":120,"max":220},{"label":"A2","min":225,"max":545},{"label":"B1","min":550,"max":780},{"label":"B2","min":785,"max":940},{"label":"C1","min":945,"max":990}]'::jsonb
)
WHERE builtin_key = 'TOEIC'
  AND default_settings #>> '{scoreScale,scale,id}' = 'toeic';

UPDATE exam_templates t
SET sections = (
    SELECT jsonb_agg(elem ORDER BY ord)
    FROM (
        SELECT s AS elem, ord
        FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS e(s, ord)
        UNION ALL
        SELECT '{
            "title": "Speaking",
            "sectionType": "SPEAKING",
            "timeLimitMinutes": 14,
            "instructions": "",
            "allowBackToQuestions": false,
            "allowBackToPart": false,
            "parts": [
                {"title": "Part 1", "oneQuestionPerPage": null},
                {"title": "Part 2", "oneQuestionPerPage": null},
                {"title": "Part 3", "oneQuestionPerPage": null}
            ]
        }'::jsonb,
        100
        WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(t.sections) AS sec
            WHERE sec ->> 'sectionType' = 'SPEAKING'
        )
    ) AS combined(elem, ord)
)
WHERE builtin_key = 'IELTS'
  AND jsonb_typeof(t.sections) = 'array'
  AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(t.sections) AS sec
      WHERE sec ->> 'sectionType' = 'SPEAKING'
  );

UPDATE exam_templates t
SET default_settings = jsonb_set(
    default_settings,
    '{scoreScale,scale,sections}',
    COALESCE((
        SELECT jsonb_agg(sec ORDER BY ord)
        FROM jsonb_array_elements(default_settings #> '{scoreScale,scale,sections}') WITH ORDINALITY AS e(sec, ord)
    ), '[]'::jsonb) || '[{
        "name": "Speaking",
        "sectionType": "SPEAKING",
        "min": 1,
        "max": 9,
        "step": 0.5,
        "convert": {"method": "manual"}
    }]'::jsonb
)
WHERE builtin_key = 'IELTS'
  AND jsonb_typeof(default_settings #> '{scoreScale,scale,sections}') = 'array'
  AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(default_settings #> '{scoreScale,scale,sections}') AS sec
      WHERE sec ->> 'sectionType' = 'SPEAKING'
  );