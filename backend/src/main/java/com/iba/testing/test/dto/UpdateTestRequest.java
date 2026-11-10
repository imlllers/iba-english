package com.iba.testing.test.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTestRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 50000) String description,
        JsonNode settings
) {
}
