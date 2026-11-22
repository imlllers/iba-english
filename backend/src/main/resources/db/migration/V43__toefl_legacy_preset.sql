UPDATE exam_templates
SET title = 'TOEFL iBT (2026)'
WHERE builtin_key = 'TOEFL';

UPDATE exam_templates
SET default_settings = jsonb_set(
    default_settings,
    '{scoreScale,sourceId}',
    '"toefl-legacy"'::jsonb
)
WHERE builtin_key = 'TOEFL_LEGACY'
  AND default_settings #>> '{scoreScale,scale,aggregate}' = 'sum'
  AND default_settings #>> '{scoreScale,sourceId}' = 'toefl';

UPDATE teacher_score_scales t
SET scales = (
    SELECT jsonb_agg(
               CASE
                   WHEN scale ->> 'id' = 'toefl'
                        AND scale ->> 'aggregate' = 'sum'
                        AND NOT EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements(scale -> 'sections') AS sec
                            WHERE COALESCE(sec ->> 'max', '') <> '30'
                        ) THEN
                       scale
                       || jsonb_build_object('id', 'toefl-legacy', 'title', 'TOEFL iBT (0–120, до 2026)')
                   ELSE scale
               END
           )
    FROM jsonb_array_elements(t.scales) AS scale
)
WHERE jsonb_typeof(t.scales) = 'array'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(t.scales) AS scale
      WHERE scale ->> 'id' = 'toefl'
        AND scale ->> 'aggregate' = 'sum'
        AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(scale -> 'sections') AS sec
            WHERE COALESCE(sec ->> 'max', '') <> '30'
        )
  );