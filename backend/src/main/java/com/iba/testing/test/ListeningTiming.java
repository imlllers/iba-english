package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;

public final class ListeningTiming {

    public static final int DEFAULT_SECONDS = 20;

    private ListeningTiming() {
    }

    public static int seconds(JsonNode settings, String sectionType) {
        if (!"TOEFL".equals(settings.path("examType").asText("")) || !"LISTENING".equals(sectionType)) {
            return 0;
        }
        JsonNode value = settings.path("listeningAnswerSeconds");
        return value.isNumber() && value.asInt() > 0 ? value.asInt() : DEFAULT_SECONDS;
    }

    public static int questionLimit(JsonNode settings, String sectionType, JsonNode question) {
        int listening = seconds(settings, sectionType);
        return listening > 0 ? listening : question.path("settings").path("timeLimitSeconds").asInt(0);
    }
}
