package com.iba.testing.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String inviteCode,
        @NotBlank @Email String email,
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Size(min = 8, max = 100) String password
) {
}
