package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;
import static com.iba.testing.question.engine.ContentNodes.textRule;

@Component
public class TextAnswerEngine implements QuestionEngine {

    private static final Set<String> MODES = Set.of("TEXT", "NUMBER", "DATE", "TIME");

    @Override
    public Engine engine() {
        return Engine.TEXT_ANSWER;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode key = textRule();
        key.put("mode", "TEXT");
        question.setOptions(object().put("mode", "TEXT"));
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 1));
    }

    @Override
    public void demoFill(Question question) {
        setInstructions(question, "Write NO MORE THAN THREE WORDS.");
        question.setPromptContent(doc(
                paragraph("Every morning Tom drinks a cup of green tea before he leaves for work."),
                paragraph("What does Tom drink before work?")));
        ObjectNode key = textRule("green tea", "a cup of green tea");
        key.put("mode", "TEXT");
        question.setOptions(object().put("mode", "TEXT"));
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 1));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        JsonNode key = draft.answerKey();
        check.object(key, "answerKey");
        String mode = key.path("mode").asText("TEXT");
        check.shape(MODES.contains(mode), "answerKey", "Неизвестный режим ответа");
        switch (mode) {
            case "NUMBER" -> {
                check.complete(key.path("number").isNumber(), "answerKey", "Укажите числовой ответ");
                check.optionalPoints(key, "tolerance");
            }
            case "TIME" -> {
                check.complete(AnswerTexts.isTime(key.path("time").asText("")), "answerKey", "Укажите время в формате ЧЧ:ММ");
                check.optionalPoints(key, "tolerance");
            }
            case "DATE" -> {
                check.rule(key, "answerKey", "Укажите хотя бы одну дату");
                for (JsonNode value : key.path("accepted")) {
                    check.complete(date(value.asText()) != null, "answerKey", "Дата должна быть в формате ГГГГ-ММ-ДД");
                }
            }
            default -> check.rule(key, "answerKey", "Добавьте хотя бы один допустимый ответ");
        }
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
        JsonNode key = question.path("answerKey");
        boolean match = switch (key.path("mode").asText("TEXT")) {
            case "NUMBER" -> AnswerTexts.numberMatches(key.get("number"), given, AnswerTexts.points(key, "tolerance", BigDecimal.ZERO));
            case "TIME" -> AnswerTexts.timeMatches(key.path("time").asText(""), given, key.path("tolerance").asInt(0));
            case "DATE" -> dateMatches(key.path("accepted"), given);
            default -> AnswerTexts.ruleMatches(key, given);
        };
        return GradeOutcome.auto(match ? max : BigDecimal.ZERO, max);
    }

    private boolean dateMatches(JsonNode accepted, String given) {
        LocalDate actual = date(given);
        if (actual == null) {
            return false;
        }
        for (JsonNode value : accepted) {
            if (actual.equals(date(value.asText()))) {
                return true;
            }
        }
        return false;
    }

    private LocalDate date(String value) {
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException | NullPointerException exception) {
            return null;
        }
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        String given = answer.path("text").asText("");
        boolean right = !given.isBlank() && grade(question, answer).awarded().signum() > 0;
        return ContentNodes.object().put("_", AnswerTexts.mark(!given.isBlank(), right));
    }
}
