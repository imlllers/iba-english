package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.id;
import static com.iba.testing.question.engine.ContentNodes.item;
import static com.iba.testing.question.engine.ContentNodes.items;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;

@Component
public class ChoiceEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.CHOICE;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        question.setOptions(items(item(id(), ""), item(id(), ""), item(id(), ""), item(id(), "")));
        question.setAnswerKey(object());
        question.setScoringConfig(object().put("points", 1).put("negativePoints", 0));
    }

    @Override
    public void demoFill(Question question) {
        String a = id();
        String b = id();
        String c = id();
        setInstructions(question, "Choose the correct option.");
        question.setPromptContent(doc(paragraph("She ______ to work by tram every morning.")));
        question.setOptions(items(item(a, "goes"), item(b, "go"), item(c, "going")));
        question.setAnswerKey(object().put("correctOptionId", a));
        question.setScoringConfig(object().put("points", 1).put("negativePoints", 0));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        Set<String> ids = check.items(draft.options(), "options", "Варианты", 2);
        check.object(draft.answerKey(), "answerKey");
        check.complete(ids.contains(draft.answerKey().path("correctOptionId").asText("")), "answerKey", "Отметьте верный вариант");
        check.points(draft.scoringConfig(), "points");
        check.optionalPoints(draft.scoringConfig(), "negativePoints");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        return AnswerTexts.points(question.get("scoringConfig"), "points", BigDecimal.ONE);
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal max = maxScore(question);
        String given = answer.path("optionId").asText("");
        if (given.isBlank()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        if (given.equals(question.path("answerKey").path("correctOptionId").asText())) {
            return GradeOutcome.auto(max, max);
        }
        BigDecimal penalty = AnswerTexts.points(question.get("scoringConfig"), "negativePoints", BigDecimal.ZERO);
        return GradeOutcome.auto(penalty.negate(), max);
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        String given = answer.path("optionId").asText("");
        return ContentNodes.object().put("_", AnswerTexts.mark(!given.isBlank(),
                !given.isBlank() && given.equals(question.path("answerKey").path("correctOptionId").asText())));
    }
}
