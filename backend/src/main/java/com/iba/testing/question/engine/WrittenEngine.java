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
public class WrittenEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.WRITTEN;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode settings = object();
        settings.putArray("criteria");
        settings.put("minWords", 0);
        settings.put("maxWords", 0);
        question.setSettings(settings);
        question.setOptions(object());
        question.setAnswerKey(object());
        question.setScoringConfig(object().put("manual", true).put("maxPoints", 0));
    }

    @Override
    public void demoFill(Question question) {
        ObjectNode settings = object();
        question.setPromptContent(doc(paragraph("Write a short note to a friend inviting them to a picnic. Say where and when it will be and what they should bring.")));
        settings.putArray("criteria");
        settings.put("minWords", 40);
        settings.put("maxWords", 60);
        settings.put("instructions", "Write 40-60 words.");
        question.setSettings(settings);
        question.setOptions(object());
        question.setAnswerKey(object());
        question.setScoringConfig(object().put("manual", true).put("maxPoints", 0));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.criteria(draft.settings());
        limit(check, draft.settings(), "minWords");
        limit(check, draft.settings(), "maxWords");
        check.optionalPoints(draft.scoringConfig(), "maxPoints");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        return maxFrom(question.path("settings"), question.path("scoringConfig"));
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal max = maxScore(question);
        if (answer.path("text").asText("").isBlank()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        return GradeOutcome.review(max);
    }

    static BigDecimal maxFrom(JsonNode settings, JsonNode scoring) {
        JsonNode criteria = settings.path("criteria");
        if (criteria.isArray() && !criteria.isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            for (JsonNode criterion : criteria) {
                sum = sum.add(AnswerTexts.points(criterion, "maxPoints", BigDecimal.ZERO));
            }
            return sum;
        }
        return AnswerTexts.points(scoring, "maxPoints", BigDecimal.ZERO);
    }

    private void limit(ContentCheck check, JsonNode settings, String field) {
        JsonNode value = settings.get(field);
        check.shape(value == null || value.isNull() || (value.isInt() && value.asInt() >= 0 && value.asInt() <= 5000),
                "settings", "Лимит слов должен быть целым числом от 0 до 5000");
    }
}
