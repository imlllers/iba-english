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
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScaleEvaluatorAverageTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ScaleEvaluator evaluator = new ScaleEvaluator(mapper);

    @Test
    void averageSkipsScaleSectionsMissingInTest() {
        ObjectNode scale = mapper.createObjectNode();
        scale.put("title", "IELTS");
        scale.put("aggregate", "average");
        ObjectNode round = scale.putObject("round");
        round.put("step", 0.5);
        round.put("mode", "nearest");
        ArrayNode scaleSections = scale.putArray("sections");
        for (String name : List.of("Listening", "Reading", "Writing", "Speaking")) {
            ObjectNode section = scaleSections.addObject();
            section.put("name", name);
            section.put("sectionType", name.toUpperCase(java.util.Locale.ROOT));
            section.put("min", 1);
            section.put("max", 9);
            section.put("step", 0.5);
            ObjectNode convert = section.putObject("convert");
            convert.put("method", "manual");
        }

        ArrayNode contentSections = mapper.createArrayNode();
        UUID q1 = UUID.randomUUID();
        UUID q2 = UUID.randomUUID();
        UUID q3 = UUID.randomUUID();
        for (var entry : List.of(
                new String[] { "LISTENING", "Listening", q1.toString() },
                new String[] { "READING", "Reading", q2.toString() },
                new String[] { "WRITING", "Writing", q3.toString() })) {
            ObjectNode section = contentSections.addObject();
            section.put("id", UUID.randomUUID().toString());
            section.put("title", entry[1]);
            section.put("sectionType", entry[0]);
            ArrayNode questions = section.putArray("questions");
            ObjectNode question = questions.addObject();
            question.put("id", entry[2]);
            question.put("type", "SINGLE_CHOICE");
        }

        ObjectNode content = mapper.createObjectNode();
        content.set("sections", contentSections);

        ObjectNode settings = mapper.createObjectNode();
        ObjectNode binding = settings.putObject("scoreScale");
        binding.set("scale", scale);
        binding.putArray("sections");

        ObjectNode manual = mapper.createObjectNode();
        manual.put("0", 6);
        manual.put("1", 6.5);
        manual.put("2", 7);

        TestVersion version = new TestVersion();
        version.setContentSnapshot(content);
        version.setSettingsSnapshot(settings);

        TestAttempt attempt = new TestAttempt();
        attempt.setTestVersion(version);
        attempt.setScaleManual(manual);

        List<Answer> answers = List.of(
                answer(q1, 1, 1),
                answer(q2, 1, 1),
                answer(q3, 1, 1));

        ObjectNode result = evaluator.evaluate(attempt, answers);
        assertTrue(result.path("complete").asBoolean());
        assertEquals(6.5, result.path("total").asDouble(), 1e-9);
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