package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;

@Component
public class SpeakingEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.SPEAKING;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode settings = object();
        settings.putArray("criteria");
        settings.put("maxSeconds", 120);
        settings.put("preparationSeconds", 0);
        question.setSettings(settings);
        question.setOptions(object());
        question.setAnswerKey(object());
        question.setScoringConfig(object().put("manual", true).put("maxPoints", 0));
    }

    @Override
    public void demoFill(Question question) {
        question.setPromptContent(doc(paragraph("Talk about a place you enjoyed visiting. Say where it is, when you went there and why you liked it.")));
        ObjectNode settings = object();
        settings.putArray("criteria");
        settings.put("maxSeconds", 120);
        settings.put("preparationSeconds", 30);
        settings.put("instructions", "You have 30 seconds to prepare, then speak for up to 2 minutes.");
        question.setSettings(settings);
        question.setOptions(object());
        question.setAnswerKey(object());
        question.setScoringConfig(object().put("manual", true).put("maxPoints", 0));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.criteria(draft.settings());
        JsonNode seconds = draft.settings().path("maxSeconds");
        check.shape(seconds.isInt() && seconds.asInt() >= 10 && seconds.asInt() <= 600, "settings",
                "Длительность записи должна быть от 10 до 600 секунд");
        JsonNode preparation = draft.settings().path("preparationSeconds");
        check.shape(preparation.isMissingNode() || (preparation.isInt() && preparation.asInt() >= 0 && preparation.asInt() <= 300),
                "settings", "Время подготовки должно быть от 0 до 300 секунд");
        check.optionalPoints(draft.scoringConfig(), "maxPoints");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        return maxScore(question.path("settings"), question.path("scoringConfig"));
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal max = maxScore(question);
        if (answer.path("mediaId").asText("").isBlank()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        return GradeOutcome.review(max);
    }

    private BigDecimal maxScore(JsonNode settings, JsonNode scoring) {
        return WrittenEngine.maxFrom(settings, scoring);
    }
}
