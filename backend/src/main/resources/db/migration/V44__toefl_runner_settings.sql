ALTER TABLE section_parts
    ADD COLUMN IF NOT EXISTS auto_advance_on_timeout BOOLEAN;

ALTER TABLE test_sections
    ADD COLUMN IF NOT EXISTS speaking_auto_flow BOOLEAN;

UPDATE test_sections ts
SET allow_back_to_part = false
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'READING';

UPDATE section_parts sp
SET auto_advance_on_timeout = true
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE sp.section_id = ts.id
  AND t.exam_preset = 'TOEFL'
  AND sp.time_limit_minutes IS NOT NULL
  AND sp.time_limit_minutes > 0;

UPDATE test_sections ts
SET speaking_auto_flow = true
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'SPEAKING';

UPDATE exam_templates
SET sections = (
    SELECT jsonb_agg(
               CASE
                   WHEN elem ->> 'sectionType' = 'READING' THEN
                       jsonb_set(elem, '{allowBackToPart}', 'false'::jsonb, true)
                   WHEN elem ->> 'sectionType' = 'SPEAKING' THEN
                       jsonb_set(elem, '{speakingAutoFlow}', 'true'::jsonb, true)
                   ELSE elem
               END
           )
    FROM jsonb_array_elements(sections) AS elem
)
WHERE builtin_key = 'TOEFL'
  AND jsonb_typeof(sections) = 'array';

UPDATE test_versions tv
SET content_snapshot = jsonb_set(
        content_snapshot,
        '{sections}',
        (
            SELECT jsonb_agg(patched)
            FROM (
                     SELECT CASE
                                WHEN sec ->> 'sectionType' = 'READING' THEN
                                    jsonb_set(sec, '{allowBackToPart}', 'false'::jsonb, true)
                                WHEN sec ->> 'sectionType' = 'SPEAKING' THEN
                                    jsonb_set(sec, '{speakingAutoFlow}', 'true'::jsonb, true)
                                ELSE sec
                            END AS patched
                     FROM jsonb_array_elements(tv.content_snapshot -> 'sections') AS sec
                 ) s
        ),
        true
    )
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND jsonb_typeof(tv.content_snapshot -> 'sections') = 'array';

UPDATE test_versions tv
SET content_snapshot = jsonb_set(
        content_snapshot,
        '{sections}',
        (
            SELECT jsonb_agg(
                       CASE
                           WHEN jsonb_typeof(sec -> 'parts') = 'array' THEN
                               jsonb_set(
                                   sec,
                                   '{parts}',
                                   (
                                       SELECT jsonb_agg(
                                                  CASE
                                                      WHEN pt ->> 'timeLimitMinutes' IS NOT NULL
                                                          AND (pt ->> 'timeLimitMinutes') ~ '^[0-9]+$'
                                                          AND (pt ->> 'timeLimitMinutes')::int > 0 THEN
                                                          jsonb_set(pt, '{autoAdvanceOnTimeout}', 'true'::jsonb, true)
                                                      ELSE pt
                                                      END
                                              )
                                       FROM jsonb_array_elements(sec -> 'parts') AS pt
                                   ),
                                   true
                               )
                           ELSE sec
                       END
                   )
            FROM jsonb_array_elements(tv.content_snapshot -> 'sections') AS sec
        ),
        true
    )
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND jsonb_typeof(tv.content_snapshot -> 'sections') = 'array';