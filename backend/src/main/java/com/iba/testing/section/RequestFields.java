package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;

public final class RequestFields {

    private RequestFields() {
    }

    public static boolean present(JsonNode body, String name) {
        return body != null && body.has(name);
    }
}