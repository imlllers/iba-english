-- Participant result detail: score_only | score_and_scale only.

UPDATE tests t
SET settings = jsonb_set(
        t.settings - 'showLevelToParticipant',
        '{resultDetail}',
        to_jsonb(
                CASE
                    WHEN t.settings ->> 'resultDetail' IN ('score_and_scale', 'score_review_and_scale') THEN 'score_and_scale'
                    WHEN t.settings ? 'showLevelToParticipant'
                        AND coalesce((t.settings ->> 'showLevelToParticipant')::boolean, false) THEN 'score_and_scale'
                    ELSE 'score_only'
                    END
            ),
        true
    );

UPDATE exam_templates
SET default_settings = jsonb_set(
        default_settings - 'showLevelToParticipant',
        '{resultDetail}',
        to_jsonb(
                CASE
                    WHEN default_settings ->> 'resultDetail' IN ('score_and_scale', 'score_review_and_scale') THEN 'score_and_scale'
                    WHEN default_settings ? 'showLevelToParticipant'
                        AND coalesce((default_settings ->> 'showLevelToParticipant')::boolean, false) THEN 'score_and_scale'
                    ELSE 'score_only'
                    END
            ),
        true
    );

UPDATE test_versions tv
SET settings_snapshot = jsonb_set(
        tv.settings_snapshot - 'showLevelToParticipant',
        '{resultDetail}',
        to_jsonb(
                CASE
                    WHEN tv.settings_snapshot ->> 'resultDetail' IN ('score_and_scale', 'score_review_and_scale') THEN 'score_and_scale'
                    WHEN tv.settings_snapshot ? 'showLevelToParticipant'
                        AND coalesce((tv.settings_snapshot ->> 'showLevelToParticipant')::boolean, false) THEN 'score_and_scale'
                    ELSE 'score_only'
                    END
            ),
        true
    );