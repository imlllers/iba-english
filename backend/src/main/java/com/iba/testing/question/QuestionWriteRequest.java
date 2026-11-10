package com.iba.testing.question;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record QuestionWriteRequest(
        @NotBlank String type,
        @NotNull JsonNode promptContent,
        @NotNull JsonNode options,
        @NotNull JsonNode answerKey,
        @NotNull JsonNode scoringConfig,
        @NotNull Boolean required,
        @NotNull JsonNode settings
) {
}
