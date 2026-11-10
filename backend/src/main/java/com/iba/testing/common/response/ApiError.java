package com.iba.testing.common.response;

import java.util.Map;

public record ApiError(String code, String message, Map<String, String> fields) {

    public ApiError(String code, String message) {
        this(code, message, Map.of());
    }
}
