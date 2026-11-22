-- Per-question Listening time (2026 TOEFL): drop test-level listeningAnswerSeconds, default 20s on questions.

UPDATE exam_templates
SET default_settings = default_settings - 'listeningAnswerSeconds'
WHERE builtin_key = 'TOEFL';

UPDATE tests t
SET settings = t.settings - 'listeningAnswerSeconds'
WHERE t.exam_preset = 'TOEFL';

UPDATE test_versions tv
SET settings_snapshot = tv.settings_snapshot - 'listeningAnswerSeconds'
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL';

UPDATE questions q
SET settings = jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{timeLimitSeconds}', '20'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE q.section_id = ts.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'LISTENING'
  AND COALESCE((q.settings ->> 'timeLimitSeconds')::int, 0) <= 0;

UPDATE test_versions tv
SET content_snapshot = jsonb_set(
        tv.content_snapshot,
        '{sections}',
        (
            SELECT COALESCE(jsonb_agg(
                               CASE
                                   WHEN sec_val ->> 'sectionType' = 'LISTENING' THEN
                                       jsonb_set(
                                               sec_val,
                                               '{questions}',
                                               (
                                                   SELECT COALESCE(jsonb_agg(
                                                                       CASE
                                                                           WHEN COALESCE((q_val -> 'settings' ->> 'timeLimitSeconds')::int, 0) <= 0
                                                                               THEN jsonb_set(
                                                                                   q_val,
                                                                                   '{settings}',
                                                                                   COALESCE(q_val -> 'settings', '{}'::jsonb)
                                                                                       || jsonb_build_object('timeLimitSeconds', 20),
                                                                                   true
                                                                                   )
                                                                           ELSE q_val
                                                                           END
                                                                   ), '[]'::jsonb)
                                                   FROM jsonb_array_elements(
                                                                CASE
                                                                    WHEN jsonb_typeof(sec_val -> 'questions') = 'array'
                                                                        THEN sec_val -> 'questions'
                                                                    ELSE '[]'::jsonb END
                                                            ) AS q_val
                                               ),
                                               true
                                       )
                                   ELSE sec_val
                                   END
                           ), '[]'::jsonb)
            FROM jsonb_array_elements(
                         CASE
                             WHEN jsonb_typeof(tv.content_snapshot -> 'sections') = 'array'
                                 THEN tv.content_snapshot -> 'sections'
                             ELSE '[]'::jsonb END
                     ) AS sec_val
        ),
        true
    )
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND jsonb_typeof(tv.content_snapshot -> 'sections') = 'array';

DO $$
DECLARE
    patched_questions integer;
BEGIN
    SELECT count(*) INTO patched_questions
    FROM questions q
             JOIN test_sections ts ON ts.id = q.section_id
             JOIN tests t ON t.id = ts.test_id
    WHERE t.exam_preset = 'TOEFL'
      AND ts.section_type = 'LISTENING'
      AND COALESCE((q.settings ->> 'timeLimitSeconds')::int, 0) > 0;
    RAISE NOTICE 'V49: Listening questions with timeLimitSeconds: %', patched_questions;
END $$;