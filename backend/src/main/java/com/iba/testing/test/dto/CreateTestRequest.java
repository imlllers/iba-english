package com.iba.testing.test.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateTestRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 50000) String description,
        @Size(max = 40) String examPreset,
        UUID templateId
) {
}
