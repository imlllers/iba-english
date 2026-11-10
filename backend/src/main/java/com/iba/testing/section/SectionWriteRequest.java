package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SectionWriteRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 4000) String instructions,
        @NotBlank String sectionType,
        Integer timeLimitMinutes,
        Boolean allowBackToQuestions,
        Boolean allowBackToPart,
        JsonNode items
) {
}
