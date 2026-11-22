package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;

public final class ResultDisplay {

    private ResultDisplay() {
    }

    public static String normalizeDetail(JsonNode settings) {
        String detail = settings.path("resultDetail").asText("score_only");
        if ("score_and_scale".equals(detail) || "score_review_and_scale".equals(detail)) {
            return "score_and_scale";
        }
        if ("sections_only".equals(detail) || "scale_only".equals(detail)) {
            return "sections_only";
        }
        return "score_only";
    }

    public static boolean showsScale(JsonNode settings) {
        String detail = normalizeDetail(settings);
        return "score_and_scale".equals(detail) || "sections_only".equals(detail);
    }

    public static boolean showsOverall(JsonNode settings) {
        String detail = normalizeDetail(settings);
        return "score_only".equals(detail) || "score_and_scale".equals(detail);
    }
}