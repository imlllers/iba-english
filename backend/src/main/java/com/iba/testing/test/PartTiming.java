package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;

public final class PartTiming {

    private PartTiming() {
    }

    public static int limitSeconds(JsonNode part) {
        if (part == null || part.isMissingNode()) {
            return 0;
        }
        JsonNode secondsNode = part.get("timeLimitSeconds");
        if (secondsNode != null && secondsNode.isNumber() && secondsNode.asInt() > 0) {
            return secondsNode.asInt();
        }
        int minutes = part.path("timeLimitMinutes").asInt(0);
        return minutes > 0 ? minutes * 60 : 0;
    }
}