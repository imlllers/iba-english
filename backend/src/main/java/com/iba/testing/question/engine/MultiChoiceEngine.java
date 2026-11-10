package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.id;
import static com.iba.testing.question.engine.ContentNodes.item;
import static com.iba.testing.question.engine.ContentNodes.items;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;
import static com.iba.testing.question.engine.ContentNodes.strings;

@Component
public class MultiChoiceEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.MULTI_CHOICE;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        question.setOptions(items(item(id(), ""), item(id(), ""), item(id(), ""), item(id(), "")));
        ObjectNode key = object();
        key.putArray("correctOptionIds");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 1).put("partial", false).put("negativePoints", 0));
    }

    @Override
    public void demoFill(Question question) {
        String a = id();
        String b = id();
        String c = id();
        String d = id();
        setInstructions(question, "Choose TWO correct options.");
        question.setPromptContent(doc(
                paragraph("The new community centre opens next month. It has a computer room, a café and a children's library, but there is no swimming pool."),
                paragraph("Which TWO facilities does the community centre offer?")));
        question.setOptions(items(item(a, "A swimming pool"), item(b, "A computer room"), item(c, "A cinema"), item(d, "A children's library")));
        ObjectNode key = object();
        key.set("correctOptionIds", strings(b, d));
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 2).put("partial", false).put("negativePoints", 0));
        ObjectNode settings = question.getSettings() instanceof ObjectNode object ? object : object();
        settings.put("selectCount", 2);
        question.setSettings(settings);
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        Set<String> ids = check.items(draft.options(), "options", "Варианты", 2);
        check.object(draft.answerKey(), "answerKey");
        JsonNode correct = draft.answerKey().path("correctOptionIds");
        check.shape(correct.isMissingNode() || correct.isArray(), "answerKey", "Верные варианты должны быть списком");
        check.complete(correct.isArray() && !correct.isEmpty(), "answerKey", "Отметьте хотя бы один верный вариант");
        for (JsonNode value : correct) {
            check.complete(ids.contains(value.asText()), "answerKey", "Верный вариант отсутствует среди опций");
        }
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
        Set<String> correct = values(question.path("answerKey").path("correctOptionIds"));
        Set<String> selected = values(answer.path("optionIds"));
        if (selected.isEmpty() || correct.isEmpty()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        if (question.path("scoringConfig").path("partial").asBoolean(false)) {
            int hits = 0;
            int wrong = 0;
            for (String value : selected) {
                if (correct.contains(value)) {
                    hits++;
                } else {
                    wrong++;
                }
            }
            return GradeOutcome.auto(AnswerTexts.share(max, hits - wrong, correct.size()), max);
        }
        if (selected.equals(correct)) {
            return GradeOutcome.auto(max, max);
        }
        BigDecimal penalty = AnswerTexts.points(question.get("scoringConfig"), "negativePoints", BigDecimal.ZERO);
        return GradeOutcome.auto(penalty.negate(), max);
    }

    private Set<String> values(JsonNode array) {
        Set<String> values = new HashSet<>();
        if (array.isArray()) {
            array.forEach(value -> values.add(value.asText()));
        }
        return values;
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        Set<String> correct = values(question.path("answerKey").path("correctOptionIds"));
        Set<String> selected = values(answer.path("optionIds"));
        if (selected.isEmpty()) {
            return ContentNodes.object().put("_", "empty");
        }
        return ContentNodes.object().put("_", selected.equals(correct) ? "correct" : "wrong");
    }
}
