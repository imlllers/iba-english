package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.textRule;

@Component
public class ErrorHuntEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.ERROR_HUNT;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.put("text", "");
        options.put("unit", "WORD");
        options.set("segments", TextSegments.split("", "WORD"));
        question.setOptions(options);
        ObjectNode key = object();
        key.putObject("errors");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerError", 1));
        question.setSettings(object().put("reviewIfNoMatch", true));
    }

    @Override
    public void demoFill(Question question) {
        boolean sentences = question.getType() == QuestionType.SENTENCE_ERRORS;
        String text = sentences
                ? "Yesterday I go to the market."
                : "Yesterday I go to the market and buyed some apples. They was very fresh.";
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.put("text", text);
        options.put("unit", "WORD");
        options.set("segments", TextSegments.split(text, "WORD"));
        question.setOptions(options);
        ObjectNode key = object();
        ObjectNode errors = key.putObject("errors");
        errors.set("s2", textRule("went"));
        if (!sentences) {
            errors.set("s7", textRule("bought"));
            errors.set("s11", textRule("were"));
        }
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerError", 1));
        ObjectNode settings = object();
        settings.put("reviewIfNoMatch", true);
        settings.put("instructions", sentences
                ? "Click the wrong word and write the correct form."
                : "The text contains three mistakes. Click each wrong word and write the correct form.");
        question.setSettings(settings);
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.options(), "options");
        check.text(draft.options().get("text"), "options", "Текст");
        Set<String> ids = check.items(draft.options().path("segments"), "options", "Слова текста", 1);
        check.object(draft.answerKey(), "answerKey");
        JsonNode errors = draft.answerKey().path("errors");
        check.shape(errors.isMissingNode() || errors.isObject(), "answerKey", "Некорректный список ошибок");
        check.complete(errors.isObject() && !errors.isEmpty(), "answerKey", "Отметьте хотя бы одну ошибку");
        errors.fields().forEachRemaining(entry -> {
            check.complete(ids.contains(entry.getKey()), "answerKey", "Ошибка отмечена на слове, которого нет в тексте");
            check.rule(entry.getValue(), "answerKey", "Укажите исправление для каждой ошибки");
        });
        JsonNode review = draft.settings().path("reviewIfNoMatch");
        check.shape(review.isMissingNode() || review.isBoolean(), "settings", "Некорректная настройка проверки");
        check.points(draft.scoringConfig(), "pointsPerError");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerError", BigDecimal.ONE);
        return AnswerTexts.times(each, question.path("answerKey").path("errors").size());
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerError", BigDecimal.ONE);
        BigDecimal max = maxScore(question);
        JsonNode corrections = answer.path("corrections");
        int correct = 0;
        boolean unclear = false;
        var errors = question.path("answerKey").path("errors").fields();
        while (errors.hasNext()) {
            var error = errors.next();
            String given = corrections.path(error.getKey()).asText("");
            if (AnswerTexts.ruleMatches(error.getValue(), given)) {
                correct++;
            } else if (!given.isBlank()) {
                unclear = true;
            }
        }
        if (unclear && question.path("settings").path("reviewIfNoMatch").asBoolean(false)) {
            return GradeOutcome.review(max);
        }
        return GradeOutcome.auto(AnswerTexts.times(each, correct), max);
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        ObjectNode marks = ContentNodes.object();
        JsonNode corrections = answer.path("corrections");
        var errors = question.path("answerKey").path("errors").fields();
        while (errors.hasNext()) {
            var error = errors.next();
            String given = corrections.path(error.getKey()).asText("");
            marks.put(error.getKey(), AnswerTexts.mark(!given.isBlank(), AnswerTexts.ruleMatches(error.getValue(), given)));
        }
        return marks;
    }
}
