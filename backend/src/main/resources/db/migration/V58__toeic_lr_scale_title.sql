UPDATE teacher_score_scales t
SET scales = (
    SELECT COALESCE(jsonb_agg(
               CASE
                   WHEN scale ->> 'id' = 'toeic' AND scale ->> 'title' = 'TOEIC' THEN
                       jsonb_set(scale, '{title}', '"TOEIC Listening & Reading"'::jsonb)
                   ELSE scale
               END
           ), '[]'::jsonb)
    FROM jsonb_array_elements(t.scales) AS scale
)
WHERE jsonb_typeof(t.scales) = 'array'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(t.scales) AS scale
      WHERE scale ->> 'id' = 'toeic'
        AND scale ->> 'title' = 'TOEIC'
  );

UPDATE exam_templates
SET default_settings = jsonb_set(
    default_settings,
    '{scoreScale,scale,title}',
    '"TOEIC Listening & Reading"'::jsonb
)
WHERE default_settings #>> '{scoreScale,scale,id}' = 'toeic'
  AND default_settings #>> '{scoreScale,scale,title}' = 'TOEIC';

UPDATE tests
SET settings = jsonb_set(
    settings,
    '{scoreScale,scale,title}',
    '"TOEIC Listening & Reading"'::jsonb
)
WHERE settings #>> '{scoreScale,scale,id}' = 'toeic'
  AND settings #>> '{scoreScale,scale,title}' = 'TOEIC';

UPDATE test_versions tv
SET settings_snapshot = jsonb_set(
    settings_snapshot,
    '{scoreScale,scale,title}',
    '"TOEIC Listening & Reading"'::jsonb
)
WHERE settings_snapshot #>> '{scoreScale,scale,id}' = 'toeic'
  AND settings_snapshot #>> '{scoreScale,scale,title}' = 'TOEIC';