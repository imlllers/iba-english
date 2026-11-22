-- Live: убрать общий лимит Writing (2026), включить auto-flow Speaking legacy
UPDATE test_sections ts
SET time_limit_minutes = NULL
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL'
  AND ts.section_type = 'WRITING'
  AND ts.time_limit_minutes IS NOT NULL;

UPDATE test_sections ts
SET speaking_auto_flow = true
FROM tests t
WHERE ts.test_id = t.id
  AND t.exam_preset = 'TOEFL_LEGACY'
  AND ts.section_type = 'SPEAKING'
  AND COALESCE(ts.speaking_auto_flow, false) = false;

UPDATE questions q
SET settings = jsonb_set(COALESCE(q.settings, '{}'::jsonb), '{minWords}', '100'::jsonb, true)
FROM test_sections ts
         JOIN tests t ON t.id = ts.test_id
         JOIN section_parts sp ON sp.section_id = ts.id
WHERE q.section_id = ts.id
  AND q.part_id = sp.id
  AND t.exam_preset IN ('TOEFL', 'TOEFL_LEGACY')
  AND ts.section_type = 'WRITING'
  AND lower(COALESCE(sp.title, '')) LIKE '%discussion%'
  AND q.type IN ('WRITTEN', 'WRITTEN_ESSAY', 'WRITTEN_EMAIL')
  AND (NOT (q.settings ? 'minWords') OR COALESCE((q.settings ->> 'minWords')::int, 0) <= 0);

UPDATE test_versions tv
SET content_snapshot = jsonb_set(
        content_snapshot,
        '{sections}',
        (
            SELECT jsonb_agg(
                       CASE
                           WHEN sec ->> 'sectionType' = 'WRITING'
                               AND t.exam_preset = 'TOEFL' THEN jsonb_set(sec, '{timeLimitMinutes}', 'null'::jsonb, true)
                           WHEN sec ->> 'sectionType' = 'SPEAKING'
                               AND t.exam_preset = 'TOEFL_LEGACY' THEN jsonb_set(sec, '{speakingAutoFlow}', 'true'::jsonb, true)
                           ELSE sec
                           END
                   )
            FROM jsonb_array_elements(tv.content_snapshot -> 'sections') AS sec
        ),
        true
    )
FROM tests t
WHERE tv.test_id = t.id
  AND t.exam_preset IN ('TOEFL', 'TOEFL_LEGACY')
  AND jsonb_typeof(tv.content_snapshot -> 'sections') = 'array';