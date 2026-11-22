ALTER TABLE section_parts
    ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER;

-- Built-in template defaults (new tests only; existing tests patched below)
UPDATE exam_templates
SET default_settings = default_settings
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', false,
                          'autoAdvanceOnQuestionTimeout', true, 'listeningAnswerSeconds', 20)
WHERE builtin_key = 'TOEFL';

UPDATE exam_templates
SET default_settings = (default_settings - 'listeningAnswerSeconds' - 'autoAdvanceOnQuestionTimeout')
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', true)
WHERE builtin_key = 'TOEFL_LEGACY';

UPDATE tests t
SET settings = settings
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', false)
    || jsonb_build_object('autoAdvanceOnQuestionTimeout', true, 'listeningAnswerSeconds', 20)
WHERE t.exam_preset = 'TOEFL'
  AND COALESCE(t.settings ->> 'examType', 'TOEFL') = 'TOEFL';

UPDATE tests t
SET settings = (settings - 'listeningAnswerSeconds' - 'autoAdvanceOnQuestionTimeout')
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', true)
WHERE t.exam_preset = 'TOEFL_LEGACY';

UPDATE test_sections ts
SET time_limit_minutes = NULL,
    speaking_auto_flow = true
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'SPEAKING';

UPDATE test_sections ts
SET time_limit_minutes = NULL
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset IN ('TOEFL', 'TOEFL_LEGACY')
  AND ts.section_type = 'LISTENING';

UPDATE test_sections ts
SET time_limit_minutes = NULL
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'READING';

UPDATE test_sections ts
SET speaking_auto_flow = false
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'SPEAKING';

UPDATE test_sections ts
SET time_limit_minutes = NULL
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type IN ('SPEAKING', 'WRITING');

UPDATE section_parts sp
SET time_limit_minutes = CASE sp.order_index WHEN 0 THEN 20 WHEN 1 THEN 9 END,
    time_limit_seconds = NULL,
    auto_advance_on_timeout = true
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE sp.section_id = ts.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'READING'
  AND (SELECT count(*) FROM section_parts p WHERE p.section_id = ts.id) = 2;

UPDATE test_sections ts
SET time_limit_minutes = 23
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'WRITING';

UPDATE section_parts sp
SET time_limit_minutes = CASE
                             WHEN lower(sp.title) LIKE '%build a sentence%' OR (lower(sp.title) LIKE '%sentence%' AND lower(sp.title) NOT LIKE '%discussion%') THEN 6
                             WHEN lower(sp.title) LIKE '%email%' THEN 7
                             WHEN lower(sp.title) LIKE '%discussion%' THEN 10
                             ELSE sp.time_limit_minutes
    END,
    auto_advance_on_timeout = true
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE sp.section_id = ts.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'WRITING'
  AND (lower(sp.title) LIKE '%build%' OR lower(sp.title) LIKE '%email%' OR lower(sp.title) LIKE '%discussion%');

UPDATE section_parts sp
SET time_limit_minutes = 10,
    time_limit_seconds = NULL,
    auto_advance_on_timeout = true
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE sp.section_id = ts.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'LISTENING'
  AND sp.order_index = 0
  AND (SELECT count(*) FROM section_parts p WHERE p.section_id = ts.id) = 2;

UPDATE section_parts sp
SET time_limit_minutes = NULL,
    time_limit_seconds = 390,
    auto_advance_on_timeout = true
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
WHERE sp.section_id = ts.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'LISTENING'
  AND sp.order_index = 1
  AND (SELECT count(*) FROM section_parts p WHERE p.section_id = ts.id) = 2;

UPDATE questions q
SET settings = jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{timeLimitSeconds}', '30'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN material_blocks mb ON mb.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.material_block_id = mb.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'LISTENING'
  AND mb.title ~* '(talk|podcast|academic talk)';

UPDATE questions q
SET settings = jsonb_set(
        jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{maxSeconds}', '10'::jsonb, true),
        '{preparationSeconds}', '0'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'SPEAKING'
  AND q.type = 'SPEAKING_RECORDING'
  AND (lower(COALESCE(sp.title, '')) LIKE '%listen%repeat%' OR lower(q.settings::text) LIKE '%listen%repeat%');

UPDATE questions q
SET settings = jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{maxSeconds}', '45'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'SPEAKING'
  AND q.type = 'SPEAKING_RECORDING'
  AND lower(COALESCE(sp.title, '')) LIKE '%interview%';

UPDATE questions q
SET settings = jsonb_set(
        jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{preparationSeconds}', '15'::jsonb, true),
        '{maxSeconds}', '45'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'SPEAKING'
  AND sp.order_index = 0
  AND q.type = 'SPEAKING_RECORDING';

UPDATE questions q
SET settings = jsonb_set(
        jsonb_set(
                jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{readingSeconds}', '45'::jsonb, true),
                '{preparationSeconds}', '30'::jsonb, true),
        '{maxSeconds}', '60'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'SPEAKING'
  AND sp.order_index IN (1, 2)
  AND q.type = 'SPEAKING_RECORDING';

UPDATE questions q
SET settings = jsonb_set(
        jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{preparationSeconds}', '20'::jsonb, true),
        '{maxSeconds}', '60'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'SPEAKING'
  AND sp.order_index = 3
  AND q.type = 'SPEAKING_RECORDING';

UPDATE questions q
SET settings = jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{readingSeconds}', '180'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'WRITING'
  AND lower(sp.title) LIKE '%integrated%';

UPDATE test_versions tv
SET settings_snapshot = settings_snapshot
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', false,
                          'autoAdvanceOnQuestionTimeout', true, 'listeningAnswerSeconds', 20)
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL';

UPDATE test_versions tv
SET settings_snapshot = (settings_snapshot - 'listeningAnswerSeconds' - 'autoAdvanceOnQuestionTimeout')
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', true)
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset = 'TOEFL_LEGACY';

-- Anchor: TOEFL iBT Practice Test 1 (2026)
UPDATE tests
SET settings = settings
    || jsonb_build_object('autoAdvanceOnPartTimeout', true, 'pausePartTimerDuringAudio', false,
                          'autoAdvanceOnQuestionTimeout', true, 'listeningAnswerSeconds', 20)
WHERE id = '0ca4075d-e1f5-40ab-854c-f3256eb81e62';

DO $$
DECLARE
    updated_count integer;
BEGIN
    SELECT count(*) INTO updated_count FROM tests WHERE exam_preset IN ('TOEFL', 'TOEFL_LEGACY');
    RAISE NOTICE 'V46: patched settings on % TOEFL-family tests', updated_count;
END $$;