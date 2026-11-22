package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;

public final class ListeningTiming {

    private ListeningTiming() {
    }

    public static int questionLimit(JsonNode question) {
        if (question == null || question.isMissingNode()) {
            return 0;
        }
        return question.path("settings").path("timeLimitSeconds").asInt(0);
    }
}