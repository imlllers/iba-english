-- Fold showLevelToParticipant into resultDetail; remove legacy toggle field.

UPDATE tests t
SET settings = CASE
    WHEN t.settings -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(t.settings -> 'scoreScale') = 'object'
        AND coalesce((t.settings ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(t.settings ->> 'resultDetail', 'score_only') = 'score_and_review'
        THEN (t.settings - 'showLevelToParticipant') || '{"resultDetail": "score_review_and_scale"}'::jsonb
    WHEN t.settings -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(t.settings -> 'scoreScale') = 'object'
        AND coalesce((t.settings ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(t.settings ->> 'resultDetail', 'score_only') = 'score_only'
        THEN (t.settings - 'showLevelToParticipant') || '{"resultDetail": "score_and_scale"}'::jsonb
    ELSE t.settings - 'showLevelToParticipant'
    END;

UPDATE exam_templates
SET default_settings = CASE
    WHEN default_settings -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(default_settings -> 'scoreScale') = 'object'
        AND coalesce((default_settings ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(default_settings ->> 'resultDetail', 'score_only') = 'score_and_review'
        THEN (default_settings - 'showLevelToParticipant') || '{"resultDetail": "score_review_and_scale"}'::jsonb
    WHEN default_settings -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(default_settings -> 'scoreScale') = 'object'
        AND coalesce((default_settings ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(default_settings ->> 'resultDetail', 'score_only') = 'score_only'
        THEN (default_settings - 'showLevelToParticipant') || '{"resultDetail": "score_and_scale"}'::jsonb
    ELSE default_settings - 'showLevelToParticipant'
    END;

UPDATE test_versions tv
SET settings_snapshot = CASE
    WHEN tv.settings_snapshot -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(tv.settings_snapshot -> 'scoreScale') = 'object'
        AND coalesce((tv.settings_snapshot ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(tv.settings_snapshot ->> 'resultDetail', 'score_only') = 'score_and_review'
        THEN (tv.settings_snapshot - 'showLevelToParticipant') || '{"resultDetail": "score_review_and_scale"}'::jsonb
    WHEN tv.settings_snapshot -> 'scoreScale' IS NOT NULL
        AND jsonb_typeof(tv.settings_snapshot -> 'scoreScale') = 'object'
        AND coalesce((tv.settings_snapshot ->> 'showLevelToParticipant')::boolean, true) = true
        AND coalesce(tv.settings_snapshot ->> 'resultDetail', 'score_only') = 'score_only'
        THEN (tv.settings_snapshot - 'showLevelToParticipant') || '{"resultDetail": "score_and_scale"}'::jsonb
    ELSE tv.settings_snapshot - 'showLevelToParticipant'
    END;