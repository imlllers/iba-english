package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.id;
import static com.iba.testing.question.engine.ContentNodes.item;
import static com.iba.testing.question.engine.ContentNodes.items;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;

@Component
public class JudgementEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.JUDGEMENT;
    }

    @Override
    public void fill(Question question) {
        String statementId = id();
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.set("statements", items(item(statementId, "")));
        question.setOptions(options);
        ObjectNode key = object();
        key.putObject("answers");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerStatement", 1));
    }

    @Override
    public void demoFill(Question question) {
        String first = id();
        ObjectNode options = object();
        ObjectNode answers = object();
        if (question.getType() == QuestionType.TRUE_FALSE) {
            setInstructions(question, "Decide whether the statement is true or false.");
            question.setPromptContent(doc(paragraph("The London Underground opened in 1863.")));
            options.set("statements", items(item(first, "")));
            answers.put(first, "TRUE");
        } else if (question.getType() == QuestionType.YES_NO) {
            setInstructions(question, "Answer Yes or No.");
            question.setPromptContent(doc(paragraph("Does coffee contain caffeine?")));
            options.set("statements", items(item(first, "")));
            answers.put(first, "YES");
        } else if (question.getType() == QuestionType.YES_NO_NOT_GIVEN) {
            setInstructions(question, "Does the statement agree with the information in the text?");
            question.setPromptContent(doc(
                    paragraph("Online courses often allow students to learn at their own pace. Some programmes also include weekly live sessions with a tutor."),
                    paragraph("Do all online courses include live sessions with a tutor?")));
            options.set("statements", items(item(first, "")));
            answers.put(first, "NO");
        } else {
            setInstructions(question, "Does the statement agree with the information in the text?");
            question.setPromptContent(doc(
                    paragraph("Many people prefer studying in the morning because they feel more focused. Evening classes are also popular with those who work during the day."),
                    paragraph("The text says that morning study is better for everyone than evening study.")));
            options.set("statements", items(item(first, "")));
            answers.put(first, "NOT_GIVEN");
        }
        question.setOptions(options);
        ObjectNode key = object();
        key.set("answers", answers);
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerStatement", 1).put("negativePoints", 0));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.options(), "options");
        JsonNode statements = draft.options().path("statements");
        check.shape(statements.isArray(), "options", "Ответ: ожидается список");
        check.shape(statements.size() == 1, "options", "Нужен ровно один ответ");
        Set<String> ids = new LinkedHashSet<>();
        for (JsonNode item : statements) {
            check.shape(item.isObject(), "options", "Ответ: некорректный элемент");
            String id = item.path("id").asText("");
            check.shape(!id.isBlank() && id.length() <= 100, "options", "Ответ: у элемента нет идентификатора");
            check.shape(ids.add(id), "options", "Ответ: идентификаторы повторяются");
            check.text(item.get("text"), "options", "Ответ");
        }
        check.object(draft.answerKey(), "answerKey");
        JsonNode answers = draft.answerKey().path("answers");
        check.shape(answers.isMissingNode() || answers.isObject(), "answerKey", "Некорректные ответы");
        List<String> labels = draft.type().judgementLabels();
        for (String id : ids) {
            String value = answers.path(id).asText("");
            check.shape(value.isEmpty() || labels.contains(value), "answerKey", "Недопустимый вариант ответа");
            check.complete(labels.contains(value), "answerKey", "Выберите верный ответ");
        }
        check.points(draft.scoringConfig(), "pointsPerStatement");
        check.optionalPoints(draft.scoringConfig(), "negativePoints");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerStatement", BigDecimal.ONE);
        return AnswerTexts.times(each, question.path("options").path("statements").size());
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerStatement", BigDecimal.ONE);
        BigDecimal penalty = AnswerTexts.points(question.get("scoringConfig"), "negativePoints", BigDecimal.ZERO);
        JsonNode expected = question.path("answerKey").path("answers");
        BigDecimal awarded = BigDecimal.ZERO;
        for (JsonNode statement : question.path("options").path("statements")) {
            String id = statement.path("id").asText();
            String given = answer.path("answers").path(id).asText("");
            if (given.isBlank()) {
                continue;
            }
            awarded = given.equals(expected.path(id).asText()) ? awarded.add(each) : awarded.subtract(penalty);
        }
        return GradeOutcome.auto(awarded, maxScore(question));
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        ObjectNode marks = ContentNodes.object();
        JsonNode expected = question.path("answerKey").path("answers");
        for (JsonNode statement : question.path("options").path("statements")) {
            String id = statement.path("id").asText();
            String given = answer.path("answers").path(id).asText("");
            marks.put(id, AnswerTexts.mark(!given.isBlank(), !given.isBlank() && given.equals(expected.path(id).asText())));
        }
        return marks;
    }
}
