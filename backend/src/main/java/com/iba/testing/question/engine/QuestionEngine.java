package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;

import java.math.BigDecimal;

public interface QuestionEngine {

    Engine engine();

    void fill(Question question);

    void demoFill(Question question);

    void validate(QuestionDraft draft, ContentCheck check);

    BigDecimal maxScore(JsonNode question);

    GradeOutcome grade(JsonNode question, JsonNode answer);

    default void publicHints(ObjectNode question) {
    }

    default void sanitize(ObjectNode publicQuestion) {
    }

    default ObjectNode marks(JsonNode question, JsonNode answer) {
        return ContentNodes.object();
    }
}
