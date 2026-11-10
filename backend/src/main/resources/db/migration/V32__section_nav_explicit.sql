UPDATE test_sections s
SET allow_back_to_questions = COALESCE(s.allow_back_to_questions, (t.settings ->> 'allowBackToQuestions')::boolean, true),
    allow_back_to_part      = COALESCE(s.allow_back_to_part, (t.settings ->> 'allowBackToPart')::boolean, true)
FROM tests t
WHERE s.test_id = t.id
  AND (s.allow_back_to_questions IS NULL OR s.allow_back_to_part IS NULL);
