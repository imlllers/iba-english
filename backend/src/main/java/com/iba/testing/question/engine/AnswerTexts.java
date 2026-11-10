package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Locale;

public final class AnswerTexts {

    private AnswerTexts() {
    }

    public static BigDecimal points(JsonNode scoring, String field, BigDecimal fallback) {
        if (scoring == null || scoring.get(field) == null || !scoring.get(field).isNumber()) {
            return fallback.setScale(2, RoundingMode.HALF_UP);
        }
        return scoring.get(field).decimalValue().setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal times(BigDecimal each, int count) {
        return each.multiply(BigDecimal.valueOf(count));
    }

    public static BigDecimal share(BigDecimal max, int correct, int total) {
        if (total <= 0 || correct <= 0) {
            return BigDecimal.ZERO;
        }
        return max.multiply(BigDecimal.valueOf(correct)).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    public static String normalize(String value, boolean caseInsensitive, boolean normalizeSpaces) {
        if (value == null) {
            return "";
        }
        String result = value;
        if (normalizeSpaces) {
            result = result.trim().replaceAll("\\s+", " ");
        }
        if (caseInsensitive) {
            result = result.toLowerCase(Locale.ROOT);
        }
        return result;
    }

    public static boolean ruleMatches(JsonNode rule, String given) {
        return textMatches(rule.path("accepted"), given,
                rule.path("caseInsensitive").asBoolean(true),
                rule.path("normalizeSpaces").asBoolean(true));
    }

    public static boolean textMatches(JsonNode accepted, String given, boolean caseInsensitive, boolean normalizeSpaces) {
        String normalized = normalize(given, caseInsensitive, normalizeSpaces);
        if (normalized.isEmpty() || accepted == null || !accepted.isArray()) {
            return false;
        }
        for (JsonNode item : accepted) {
            if (normalize(item.asText(""), caseInsensitive, normalizeSpaces).equals(normalized)) {
                return true;
            }
        }
        return false;
    }

    public static boolean numberMatches(JsonNode expected, String given, BigDecimal tolerance) {
        if (expected == null || !expected.isNumber() || given == null || given.isBlank()) {
            return false;
        }
        try {
            BigDecimal actual = new BigDecimal(given.trim().replace(',', '.'));
            return actual.subtract(expected.decimalValue()).abs().compareTo(tolerance) <= 0;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    public static boolean timeMatches(String expected, String given, int toleranceMinutes) {
        try {
            int target = LocalTime.parse(expected.trim()).toSecondOfDay() / 60;
            int actual = LocalTime.parse(given.trim()).toSecondOfDay() / 60;
            return Math.abs(target - actual) <= toleranceMinutes;
        } catch (DateTimeParseException | NullPointerException exception) {
            return false;
        }
    }

    public static boolean isTime(String value) {
        try {
            LocalTime.parse(value.trim());
            return true;
        } catch (DateTimeParseException | NullPointerException exception) {
            return false;
        }
    }

    public static String mark(boolean answered, boolean right) {
        return right ? "correct" : answered ? "wrong" : "empty";
    }
}
