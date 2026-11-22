package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;

public final class SectionTiming {

    private SectionTiming() {
    }

    public static int limitSeconds(JsonNode section) {
        if (section == null || section.isMissingNode()) {
            return 0;
        }
        JsonNode secondsNode = section.get("timeLimitSeconds");
        if (secondsNode != null && secondsNode.isNumber() && secondsNode.asInt() > 0) {
            return secondsNode.asInt();
        }
        int minutes = section.path("timeLimitMinutes").asInt(0);
        return minutes > 0 ? minutes * 60 : 0;
    }
}