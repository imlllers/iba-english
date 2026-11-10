package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.question.QuestionType;

public record QuestionDraft(
        QuestionType type,
        JsonNode promptContent,
        JsonNode options,
        JsonNode answerKey,
        JsonNode scoringConfig,
        JsonNode settings
) {
}
