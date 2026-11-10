package com.iba.testing.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        Boolean rememberMe,
        String adminSecret
) {
    public boolean rememberMeEnabled() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
