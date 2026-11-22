DELETE FROM exam_templates
WHERE builtin_key = 'TOEFL_LEGACY';

UPDATE teacher_score_scales t
SET scales = (
    SELECT COALESCE(jsonb_agg(scale), '[]'::jsonb)
    FROM jsonb_array_elements(t.scales) AS scale
    WHERE scale ->> 'id' <> 'toefl-legacy'
)
WHERE jsonb_typeof(t.scales) = 'array'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(t.scales) AS scale
      WHERE scale ->> 'id' = 'toefl-legacy'
  );
