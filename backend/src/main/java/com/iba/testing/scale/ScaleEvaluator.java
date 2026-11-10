package com.iba.testing.scale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.Answer;
import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.question.QuestionType;
import com.iba.testing.question.engine.Engine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ScaleEvaluator {

    private static final double EPS = 1e-9;

    private final ObjectMapper mapper;

    public ScaleEvaluator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public void apply(TestAttempt attempt, List<Answer> answers) {
        ObjectNode result = evaluate(attempt, answers);
        attempt.setScaleResult(result);
        attempt.setScaleLevel(result == null || !result.hasNonNull("level") ? null : result.path("level").asText());
    }

    public ObjectNode evaluate(TestAttempt attempt, List<Answer> answers) {
        JsonNode binding = attempt.getTestVersion().getSettingsSnapshot().path("scoreScale");
        JsonNode scale = binding.path("scale");
        if (!scale.isObject()) {
            return null;
        }
        Map<String, SectionRaw> rawBySection = rawScores(attempt.getTestVersion().getContentSnapshot(), answers);
        List<String> orderedIds = rawBySection.keySet().stream().toList();
        JsonNode manual = attempt.getScaleManual() == null ? mapper.createObjectNode() : attempt.getScaleManual();
        String examType = attempt.getTestVersion().getSettingsSnapshot().path("examType").asText("CUSTOM");

        ObjectNode result = mapper.createObjectNode();
        result.put("title", scale.path("title").asText(""));
        ArrayNode items = result.putArray("sections");
        JsonNode mapping = binding.path("sections");
        double sum = 0;
        int count = 0;
        boolean complete = true;
        int index = 0;
        java.util.Set<String> used = new java.util.HashSet<>();
        for (JsonNode section : scale.path("sections")) {
            String sectionId = "";
            String type = sectionType(section);
            if (!"CUSTOM".equals(type)) {
                for (Map.Entry<String, SectionRaw> candidate : rawBySection.entrySet()) {
                    if (!used.contains(candidate.getKey()) && type.equals(candidate.getValue().type)) {
                        sectionId = candidate.getKey();
                        break;
                    }
                }
            }
            if (sectionId.isEmpty()) {
                JsonNode entry = mapping.path(index);
                sectionId = entry.path("sectionId").asText("");
                if (sectionId.isEmpty() && entry.path("sectionIndex").isInt()) {
                    int at = entry.path("sectionIndex").asInt();
                    sectionId = at >= 0 && at < orderedIds.size() ? orderedIds.get(at) : "";
                }
            }
            used.add(sectionId);
            SectionRaw raw = rawBySection.get(sectionId);
            String method = section.path("convert").path("method").asText("linear");
            if (raw == null) {
                index++;
                continue;
            }
            ObjectNode item = items.addObject();
            item.put("index", index);
            item.put("name", section.path("name").asText(""));
            item.put("method", method);
            item.put("min", section.path("min").asDouble(0));
            item.put("max", section.path("max").asDouble(0));
            item.put("step", section.path("step").asDouble(1));
            item.put("testSectionTitle", raw.title);
            item.put("raw", raw.score.doubleValue());
            item.put("rawMax", raw.max.doubleValue());
            Double score = null;
            boolean pending = false;
            if ("manual".equals(method)) {
                JsonNode given = manual.path(String.valueOf(index));
                if (given.isNumber()) {
                    score = given.asDouble();
                } else if (raw.pending) {
                    pending = true;
                } else {
                    score = fromTasks(section, raw.tasks, "IELTS".equals(examType) && "WRITING".equals(type));
                    if (score != null) {
                        item.put("method", "tasks");
                    }
                }
            } else if (raw.pending) {
                pending = true;
            } else {
                score = convert(section, raw.score.doubleValue(), raw.max.doubleValue());
            }
            if (score == null) {
                item.putNull("score");
                complete = false;
            } else {
                item.put("score", score);
                sum += score;
                count++;
            }
            item.put("pending", pending);
            index++;
        }
        result.put("complete", complete && count > 0);
        if (!complete || count == 0) {
            result.putNull("total");
            result.putNull("level");
            return result;
        }
        double total = "average".equals(scale.path("aggregate").asText("sum")) ? sum / count : sum;
        JsonNode round = scale.path("round");
        total = roundTo(total, round.path("step").isNumber() ? round.path("step").asDouble() : 0, round.path("mode").asText("nearest"));
        result.put("total", total);
        String level = null;
        double best = Double.NEGATIVE_INFINITY;
        for (JsonNode candidate : scale.path("levels")) {
            double min = candidate.path("min").asDouble();
            boolean belowMax = !candidate.path("max").isNumber() || total <= candidate.path("max").asDouble() + EPS;
            if (total >= min - EPS && belowMax && min > best) {
                best = min;
                level = candidate.path("label").asText();
            }
        }
        if (level == null) {
            result.putNull("level");
        } else {
            result.put("level", level);
        }
        return result;
    }

    private static Double fromTasks(JsonNode section, List<double[]> tasks, boolean ieltsWriting) {
        double weighted = 0;
        double weights = 0;
        for (int at = 0; at < tasks.size(); at++) {
            double[] task = tasks.get(at);
            if (task[1] <= 0) {
                return null;
            }
            double weight = ieltsWriting && tasks.size() == 2 && at == 1 ? 2 : 1;
            weighted += weight * Math.min(Math.max(task[0] / task[1], 0), 1);
            weights += weight;
        }
        if (weights == 0) {
            return null;
        }
        double min = section.path("min").asDouble(0);
        double max = section.path("max").asDouble(0);
        double value = roundTo(weighted / weights * max, section.path("step").asDouble(0), "nearest");
        return Math.min(Math.max(value, min), max);
    }

    private static Double convert(JsonNode section, double raw, double rawMax) {
        JsonNode convert = section.path("convert");
        String method = convert.path("method").asText("linear");
        if ("table".equals(method)) {
            long scaled = Math.round(raw);
            for (JsonNode row : convert.path("table")) {
                if (scaled >= row.path("from").asDouble() - EPS && scaled <= row.path("to").asDouble() + EPS) {
                    return row.path("score").asDouble();
                }
            }
            return null;
        }
        double ratio = rawMax > 0 ? Math.min(Math.max(raw / rawMax, 0), 1) : 0;
        double min = section.path("min").asDouble(0);
        double max = section.path("max").asDouble(0);
        return roundTo(min + ratio * (max - min), section.path("step").asDouble(0), "nearest");
    }

    static double roundTo(double value, double step, String mode) {
        if (step <= 0) {
            return value;
        }
        double ratio = value / step;
        double units = switch (mode) {
            case "down" -> Math.floor(ratio + EPS);
            case "up" -> Math.ceil(ratio - EPS);
            default -> Math.floor(ratio + 0.5 + EPS);
        };
        return BigDecimal.valueOf(units * step).setScale(6, java.math.RoundingMode.HALF_UP).stripTrailingZeros().doubleValue();
    }

    private static Map<String, SectionRaw> rawScores(JsonNode content, List<Answer> answers) {
        Map<String, Answer> byQuestion = new HashMap<>();
        for (Answer answer : answers) {
            byQuestion.put(answer.getQuestionId().toString(), answer);
        }
        Map<String, SectionRaw> result = new java.util.LinkedHashMap<>();
        for (JsonNode section : content.path("sections")) {
            SectionRaw raw = new SectionRaw(section.path("title").asText(""), section.path("sectionType").asText("CUSTOM"));
            for (JsonNode question : section.path("questions")) {
                Answer answer = byQuestion.get(question.path("id").asText());
                if (answer == null) {
                    continue;
                }
                if (answer.getMaxScore() != null) {
                    raw.max = raw.max.add(answer.getMaxScore());
                }
                if (answer.isNeedsReview() || answer.getAwardedScore() == null) {
                    raw.pending = true;
                } else {
                    raw.score = raw.score.add(answer.getAwardedScore());
                    if (manualTask(question)) {
                        raw.tasks.add(new double[] {
                                answer.getAwardedScore().doubleValue(),
                                answer.getMaxScore() == null ? 0 : answer.getMaxScore().doubleValue()});
                    }
                }
            }
            result.put(section.path("id").asText(), raw);
        }
        return result;
    }

    private static boolean manualTask(JsonNode question) {
        try {
            Engine engine = QuestionType.canonicalize(question.path("type").asText("")).engine();
            return engine == Engine.WRITTEN || engine == Engine.SPEAKING;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static final java.util.Set<String> SECTION_TYPES = java.util.Set.of("LISTENING", "READING", "WRITING", "SPEAKING");

    public static String sectionType(JsonNode section) {
        String type = section.path("sectionType").asText("").toUpperCase(java.util.Locale.ROOT);
        if (SECTION_TYPES.contains(type) || "CUSTOM".equals(type)) {
            return type;
        }
        String byName = section.path("name").asText("").trim().toUpperCase(java.util.Locale.ROOT);
        return SECTION_TYPES.contains(byName) ? byName : "CUSTOM";
    }

    private static final class SectionRaw {
        final String title;
        final String type;
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        boolean pending;
        final List<double[]> tasks = new java.util.ArrayList<>();

        SectionRaw(String title, String type) {
            this.title = title;
            this.type = type;
        }
    }
}
