package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;
import static com.iba.testing.question.engine.ContentNodes.textRule;

@Component
public class TransformEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.TRANSFORM;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.put("source", "");
        question.setOptions(options);
        question.setAnswerKey(textRule());
        question.setScoringConfig(object().put("points", 1));
        question.setSettings(object().put("reviewIfNoMatch", false));
    }

    @Override
    public void demoFill(Question question) {
        ObjectNode options = object();
        setInstructions(question, "Use the word in capitals to form a word that fits the gap.");
        question.setPromptContent(doc(paragraph("The ______ of the new bridge took three years.")));
        options.put("source", "CONSTRUCT");
        question.setAnswerKey(textRule("construction"));
        question.setOptions(options);
        question.setScoringConfig(object().put("points", 1));
        question.setSettings(object().put("reviewIfNoMatch", false));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.options(), "options");
        check.text(draft.options().get("source"), "options", "Слово-основа");
        check.complete(!draft.options().path("source").asText("").isBlank(), "options", "Заполните исходное слово");
        check.rule(draft.answerKey(), "answerKey", "Добавьте хотя бы один допустимый ответ");
        JsonNode review = draft.settings().path("reviewIfNoMatch");
        check.shape(review.isMissingNode() || review.isBoolean(), "settings", "Некорректная настройка проверки");
        check.points(draft.scoringConfig(), "points");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        return AnswerTexts.points(question.get("scoringConfig"), "points", BigDecimal.ONE);
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal max = maxScore(question);
        String given = answer.path("text").asText("");
        if (given.isBlank()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        if (AnswerTexts.ruleMatches(question.path("answerKey"), given)) {
            return GradeOutcome.auto(max, max);
        }
        if (question.path("settings").path("reviewIfNoMatch").asBoolean(false)) {
            return GradeOutcome.review(max);
        }
        return GradeOutcome.auto(BigDecimal.ZERO, max);
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        String given = answer.path("text").asText("");
        return ContentNodes.object().put("_", AnswerTexts.mark(!given.isBlank(),
                !given.isBlank() && AnswerTexts.ruleMatches(question.path("answerKey"), given)));
    }
}
