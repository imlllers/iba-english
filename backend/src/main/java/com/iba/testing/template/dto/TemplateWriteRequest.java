package com.iba.testing.template.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TemplateWriteRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull JsonNode sections,
        @NotNull JsonNode defaultSettings
) {
}
