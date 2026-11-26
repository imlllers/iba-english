package com.iba.testing.scale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.Answer;
import com.iba.testing.attempt.TestAttempt;
import com.iba.testing.test.TestVersion;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScaleEvaluatorToeicTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ScaleEvaluator evaluator = new ScaleEvaluator(mapper);

    @Test
    void toeicSwManualWaitsForTeacherScore() {
        ObjectNode scale = toeicSwScale();
        ObjectNode content = speakingWritingContent();
        ObjectNode settings = settingsWithScale(scale);
        settings.put("examType", "TOEIC");

        TestVersion version = new TestVersion();
        version.setContentSnapshot(content);
        version.setSettingsSnapshot(settings);

        TestAttempt attempt = new TestAttempt();
        attempt.setTestVersion(version);

        UUID questionId = UUID.fromString(content.path("sections").get(0).path("questions").get(0).path("id").asText());
        List<Answer> answers = List.of(answer(questionId, 5, 5));

        ObjectNode result = evaluator.evaluate(attempt, answers);
        assertFalse(result.path("complete").asBoolean());
        assertTrue(result.path("total").isNull());
        assertEquals(400, result.path("totalMax").asDouble(), 1e-9);
        assertFalse(result.path("hasLevels").asBoolean());
        assertTrue(result.path("sections").get(0).path("pending").asBoolean());
        assertTrue(result.path("sections").get(0).path("score").isNull());
    }

    @Test
    void toeicSwManualTotalWhenBothSectionsScored() {
        ObjectNode scale = toeicSwScale();
        ObjectNode content = speakingWritingContent();
        ObjectNode settings = settingsWithScale(scale);
        settings.put("examType", "TOEIC");

        ObjectNode manual = mapper.createObjectNode();
        manual.put("0", 150);
        manual.put("1", 100);

        TestVersion version = new TestVersion();
        version.setContentSnapshot(content);
        version.setSettingsSnapshot(settings);

        TestAttempt attempt = new TestAttempt();
        attempt.setTestVersion(version);
        attempt.setScaleManual(manual);

        UUID questionId = UUID.fromString(content.path("sections").get(0).path("questions").get(0).path("id").asText());
        List<Answer> answers = List.of(answer(questionId, 5, 5));

        ObjectNode result = evaluator.evaluate(attempt, answers);
        assertTrue(result.path("complete").asBoolean());
        assertEquals(250, result.path("total").asDouble(), 1e-9);
        assertEquals(400, result.path("totalMax").asDouble(), 1e-9);
    }

    @Test
    void ieltsAverageTotalMaxIsSectionMax() {
        ObjectNode scale = mapper.createObjectNode();
        scale.put("title", "IELTS");
        scale.put("aggregate", "average");
        scale.putObject("round").put("step", 0.5);
        ArrayNode scaleSections = scale.putArray("sections");
        ObjectNode section = scaleSections.addObject();
        section.put("name", "Listening");
        section.put("min", 1);
        section.put("max", 9);
        section.put("step", 0.5);
        section.putObject("convert").put("method", "manual");
        scale.putArray("levels");

        ObjectNode settings = mapper.createObjectNode();
        settings.put("examType", "IELTS");
        settings.putObject("scoreScale").set("scale", scale);

        TestVersion version = new TestVersion();
        version.setSettingsSnapshot(settings);
        version.setContentSnapshot(mapper.createObjectNode().putArray("sections"));

        TestAttempt attempt = new TestAttempt();
        attempt.setTestVersion(version);

        ObjectNode result = evaluator.evaluate(attempt, List.of());
        assertEquals(9, result.path("totalMax").asDouble(), 1e-9);
    }

    private ObjectNode toeicSwScale() {
        ObjectNode scale = mapper.createObjectNode();
        scale.put("id", "toeic_sw");
        scale.put("title", "TOEIC Speaking & Writing");
        scale.put("aggregate", "sum");
        scale.putObject("round").putNull("step");
        scale.putArray("levels");
        ArrayNode scaleSections = scale.putArray("sections");
        for (String name : List.of("Speaking", "Writing")) {
            ObjectNode section = scaleSections.addObject();
            section.put("name", name);
            section.put("sectionType", name.toUpperCase());
            section.put("min", 0);
            section.put("max", 200);
            section.put("step", 10);
            section.putObject("convert").put("method", "manual");
        }
        return scale;
    }

    private ObjectNode speakingWritingContent() {
        ArrayNode sections = mapper.createArrayNode();
        for (var type : List.of("SPEAKING", "WRITING")) {
            ObjectNode section = sections.addObject();
            section.put("id", UUID.randomUUID().toString());
            section.put("title", type);
            section.put("sectionType", type);
            ArrayNode questions = section.putArray("questions");
            ObjectNode question = questions.addObject();
            question.put("id", UUID.randomUUID().toString());
            question.put("type", "SPEAKING_RECORD");
        }
        return mapper.createObjectNode().set("sections", sections);
    }

    private ObjectNode settingsWithScale(ObjectNode scale) {
        ObjectNode settings = mapper.createObjectNode();
        ObjectNode binding = settings.putObject("scoreScale");
        binding.set("scale", scale);
        binding.putArray("sections");
        return settings;
    }

    private static Answer answer(UUID questionId, int awarded, int max) {
        Answer answer = new Answer();
        answer.setQuestionId(questionId);
        answer.setAwardedScore(BigDecimal.valueOf(awarded));
        answer.setMaxScore(BigDecimal.valueOf(max));
        answer.setNeedsReview(false);
        return answer;
    }
}