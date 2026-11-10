package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuestionEnginesTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final QuestionEngines engines = new QuestionEngines(List.of(
            new ChoiceEngine(), new MultiChoiceEngine(), new JudgementEngine(),
            new TextAnswerEngine(), new TransformEngine(),
            new MatchingEngine(), new OrderingEngine(),
            new ErrorHuntEngine(), new WrittenEngine(), new SpeakingEngine(), new InlineEngine()));

    @ParameterizedTest
    @EnumSource(QuestionType.class)
    void everyTemplateIsPublishableAndGradable(QuestionType type) {
        ObjectNode question = template(type);
        engines.validate(draft(question), ContentCheck.publication());
        GradeOutcome empty = engines.grade(question, mapper.createObjectNode());
        assertFalse(empty.needsReview());
        assertEquals(0, BigDecimal.ZERO.compareTo(empty.awarded()));
        GradeOutcome perfect = engines.grade(question, correctAnswer(question));
        if (type.engine() == Engine.WRITTEN || type.engine() == Engine.SPEAKING) {
            assertEquals(0, BigDecimal.ZERO.compareTo(perfect.max()), "max score for " + type);
            assertTrue(perfect.needsReview());
        } else {
            assertTrue(perfect.max().compareTo(BigDecimal.ZERO) > 0, "max score for " + type);
            assertEquals(perfect.max(), perfect.awarded(), "perfect answer for " + type);
        }
    }

    @ParameterizedTest
    @EnumSource(QuestionType.class)
    void publicViewNeverContainsAnswerKey(QuestionType type) {
        ObjectNode question = template(type);
        ObjectNode view = engines.publicQuestion(question);
        assertNull(view.get("answerKey"));
        int viewSize = view.path("options").size() - (view.path("options").has("tailLengths") ? 1 : 0);
        assertEquals(question.path("options").size(), viewSize);
    }

    @Test
    void orderingIsShuffledForParticipants() {
        ObjectNode question = template(QuestionType.ORDER_SENTENCES);
        JsonNode original = question.path("options").path("items");
        JsonNode shown = engines.publicQuestion(question).path("options").path("items");
        assertNotEquals(original, shown);
    }

    @Test
    void draftSavesIncompleteContentButPublicationRejectsIt() {
        ObjectNode question = template(QuestionType.SINGLE_CHOICE);
        question.putObject("answerKey");
        engines.validate(draft(question), ContentCheck.draft());
        assertThrows(ApiException.class, () -> engines.validate(draft(question), ContentCheck.publication()));
    }

    @Test
    void draftRejectsBrokenStructure() {
        ObjectNode question = template(QuestionType.MATCHING);
        ((ObjectNode) question.path("options")).put("left", "not a list");
        assertThrows(ApiException.class, () -> engines.validate(draft(question), ContentCheck.draft()));
    }

    @Test
    void numericAnswerUsesTolerance() {
        ObjectNode question = template(QuestionType.SHORT_ANSWER);
        ((ObjectNode) question.path("answerKey")).put("mode", "NUMBER").put("number", 10).put("tolerance", 0.5);
        assertEquals(new BigDecimal("1.00"), engines.grade(question, text("10,4")).awarded());
        assertEquals(new BigDecimal("0.00"), engines.grade(question, text("11")).awarded());
    }

    @Test
    void timeAnswerUsesMinuteTolerance() {
        ObjectNode question = template(QuestionType.SHORT_ANSWER);
        ((ObjectNode) question.path("answerKey")).put("mode", "TIME").put("time", "14:30").put("tolerance", 5);
        assertEquals(new BigDecimal("1.00"), engines.grade(question, text("14:34")).awarded());
        assertEquals(new BigDecimal("0.00"), engines.grade(question, text("14:40")).awarded());
    }

    @Test
    void shortAnswerIgnoresCaseAndSpaces() {
        ObjectNode question = template(QuestionType.SHORT_ANSWER);
        assertEquals(new BigDecimal("1.00"), engines.grade(question, text("  Green   TEA ")).awarded());
    }

    @Test
    void wordFormationWithoutMatchScoresZero() {
        ObjectNode question = template(QuestionType.WORD_TRANSFORM);
        GradeOutcome outcome = engines.grade(question, text("constructing"));
        assertFalse(outcome.needsReview());
        assertEquals(new BigDecimal("0.00"), outcome.awarded());
    }

    @Test
    void multipleSelectGivesPartialCreditWhenEnabled() {
        ObjectNode question = template(QuestionType.MULTIPLE_SELECT);
        ((ObjectNode) question.path("scoringConfig")).put("partial", true);
        String first = question.path("answerKey").path("correctOptionIds").get(0).asText();
        ObjectNode answer = mapper.createObjectNode();
        answer.putArray("optionIds").add(first);
        assertEquals(new BigDecimal("1.00"), engines.grade(question, answer).awarded());
    }

    @Test
    void negativePointsApplyOnlyWhenConfigured() {
        ObjectNode question = template(QuestionType.SINGLE_CHOICE);
        ((ObjectNode) question.path("scoringConfig")).put("negativePoints", 0.5);
        String wrong = question.path("options").get(1).path("id").asText();
        GradeOutcome outcome = engines.grade(question, mapper.createObjectNode().put("optionId", wrong));
        assertEquals(new BigDecimal("-0.50"), outcome.awarded());
    }

    @Test
    void orderingGivesPartialCreditByPosition() {
        ObjectNode question = template(QuestionType.ORDER_SENTENCES);
        ((ObjectNode) question.path("scoringConfig")).put("points", 6).put("partial", true);
        ArrayNode order = question.path("answerKey").path("order").deepCopy();
        JsonNode first = order.get(0);
        order.set(0, order.get(1));
        order.set(1, first);
        ObjectNode answer = mapper.createObjectNode();
        answer.set("order", order);
        assertEquals(new BigDecimal("4.00"), engines.grade(question, answer).awarded());
    }

    @Test
    void orderingWithDistractorRejectsIncompleteSlots() {
        ObjectNode question = template(QuestionType.ORDER_SENTENCES);
        ObjectNode options = (ObjectNode) question.path("options");
        options.put("prefix", "The");
        options.put("suffix", "fantastic.");
        options.put("joiner", " ");
        ArrayNode distractors = options.putArray("distractors");
        distractors.addObject().put("id", "extra").put("text", "was");
        ObjectNode answer = mapper.createObjectNode();
        ArrayNode given = answer.putArray("order");
        given.add(question.path("answerKey").path("order").get(0).asText());
        given.addNull();
        for (int i = 2; i < question.path("answerKey").path("order").size(); i++) {
            given.addNull();
        }
        assertEquals(new BigDecimal("0.00"), engines.grade(question, answer).awarded());
    }

    @Test
    void orderingSanitizesDistractorsSeparately() {
        ObjectNode question = template(QuestionType.ORDER_SENTENCES);
        ObjectNode options = (ObjectNode) question.path("options");
        ArrayNode distractors = options.putArray("distractors");
        distractors.addObject().put("id", "extra-1").put("text", "was");
        distractors.addObject().put("id", "extra-2").put("text", "were");
        JsonNode shown = engines.publicQuestion(question).path("options");
        assertEquals(2, shown.path("distractors").size());
        assertNull(engines.publicQuestion(question).get("answerKey"));
    }

    @Test
    void shortWrittenWaitsForManualReview() {
        GradeOutcome outcome = engines.grade(template(QuestionType.SHORT_WRITTEN), text("Let's meet in the park tomorrow."));
        assertTrue(outcome.needsReview());
        assertEquals(0, BigDecimal.ZERO.compareTo(outcome.max()));
    }

    @Test
    void unknownTypeIsRejected() {
        ObjectNode question = mapper.createObjectNode().put("type", "DRAGON");
        assertThrows(ApiException.class, () -> engines.grade(question, mapper.createObjectNode()));
    }

    private ObjectNode template(QuestionType type) {
        Question question = new Question();
        question.setId(UUID.randomUUID());
        engines.applyDemoDefaults(question, type);
        ObjectNode node = mapper.createObjectNode();
        node.put("id", question.getId().toString());
        node.put("type", type.name());
        node.set("promptContent", question.getPromptContent());
        node.set("options", question.getOptions());
        node.set("answerKey", question.getAnswerKey());
        node.set("scoringConfig", question.getScoringConfig());
        node.set("settings", question.getSettings());
        return node;
    }

    private QuestionDraft draft(JsonNode node) {
        return new QuestionDraft(QuestionType.valueOf(node.path("type").asText()),
                node.path("promptContent"), node.path("options"), node.path("answerKey"), node.path("scoringConfig"),
                node.path("settings"));
    }

    private ObjectNode text(String value) {
        return mapper.createObjectNode().put("text", value);
    }

    private JsonNode correctAnswer(JsonNode question) {
        JsonNode key = question.path("answerKey");
        ObjectNode answer = mapper.createObjectNode();
        switch (QuestionType.valueOf(question.path("type").asText()).engine()) {
            case CHOICE -> answer.put("optionId", key.path("correctOptionId").asText());
            case MULTI_CHOICE -> answer.set("optionIds", key.path("correctOptionIds"));
            case JUDGEMENT -> answer.set("answers", key.path("answers"));
            case INLINE -> {
                ObjectNode blanks = answer.putObject("blanks");
                key.path("blanks").fields().forEachRemaining(entry -> blanks.put(entry.getKey(), entry.getValue().isTextual()
                        ? entry.getValue().asText()
                        : entry.getValue().path("accepted").get(0).asText()));
            }
            case TEXT_ANSWER -> answer.put("text", "NUMBER".equals(key.path("mode").asText())
                    ? key.path("number").asText() : key.path("accepted").get(0).asText());
            case TRANSFORM, WRITTEN -> answer.put("text", key.path("accepted").isArray() ? key.path("accepted").get(0).asText() : "Answer text");
            case MATCHING -> answer.set("pairs", key.path("pairs"));
            case ORDERING -> answer.set("order", key.path("order"));
            case ERROR_HUNT -> {
                ObjectNode corrections = answer.putObject("corrections");
                key.path("errors").fields().forEachRemaining(entry -> corrections.put(entry.getKey(), entry.getValue().path("accepted").get(0).asText()));
            }
            case SPEAKING -> answer.put("mediaId", UUID.randomUUID().toString());
        }
        return answer;
    }
}
