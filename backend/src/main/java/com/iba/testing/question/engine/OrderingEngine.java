package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.array;
import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.id;
import static com.iba.testing.question.engine.ContentNodes.item;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;
import static com.iba.testing.question.engine.ContentNodes.shuffled;

@Component
public class OrderingEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.ORDERING;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.putArray("items");
        options.putArray("distractors");
        options.put("joiner", " ");
        options.put("prefix", "");
        options.put("suffix", "");
        options.put("presentation", "list");
        question.setOptions(options);
        ObjectNode key = object();
        key.putArray("order");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 1).put("partial", false));
    }

    @Override
    public void demoFill(Question question) {
        setInstructions(question, "Move the words into the gaps to make a grammatical sentence.");
        question.setPromptContent(doc(paragraph("What was the highlight of your trip?")));
        ArrayNode items = array();
        ArrayNode order = array();
        for (String text : List.of("tour guides", "who", "showed us around", "the", "old city", "were")) {
            String itemId = id();
            items.add(item(itemId, text));
            order.add(itemId);
        }
        ArrayNode distractors = array();
        distractors.add(item(id(), "was"));
        ObjectNode options = object();
        options.set("items", items);
        options.set("distractors", distractors);
        options.put("joiner", " ");
        options.put("prefix", "The");
        options.put("suffix", "fantastic.");
        options.put("presentation", "slots");
        question.setOptions(options);
        ObjectNode key = object();
        key.set("order", order);
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("points", 1).put("partial", false));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.options(), "options");
        Set<String> ids = check.items(draft.options().path("items"), "options", "Элементы", 2);
        JsonNode distractorsNode = draft.options().path("distractors");
        Set<String> distractorIds = Set.of();
        if (!distractorsNode.isMissingNode() && !distractorsNode.isNull()) {
            distractorIds = check.items(distractorsNode, "options", "Лишние элементы", 0);
            for (String distractorId : distractorIds) {
                check.shape(!ids.contains(distractorId), "options", "Лишние элементы не должны совпадать с ответом");
            }
        }
        check.text(draft.options().get("prefix"), "options", "Текст до");
        check.text(draft.options().get("suffix"), "options", "Текст после");
        check.object(draft.answerKey(), "answerKey");
        JsonNode order = draft.answerKey().path("order");
        check.shape(order.isMissingNode() || order.isArray(), "answerKey", "Порядок должен быть списком");
        Set<String> given = new HashSet<>();
        order.forEach(value -> given.add(value.asText()));
        check.complete(order.size() == ids.size() && given.equals(ids), "answerKey", "Порядок должен включать каждый элемент ровно один раз");
        check.points(draft.scoringConfig(), "points");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        return AnswerTexts.points(question.get("scoringConfig"), "points", BigDecimal.ONE);
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal max = maxScore(question);
        List<String> expected = values(question.path("answerKey").path("order"));
        List<String> given = values(answer.path("order"));
        if (expected.isEmpty() || given.size() != expected.size()) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        if (given.stream().anyMatch(String::isBlank)) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        Set<String> allowed = new HashSet<>(expected);
        JsonNode distractors = question.path("options").path("distractors");
        if (distractors.isArray()) {
            distractors.forEach(item -> allowed.add(item.path("id").asText()));
        }
        if (!allowed.containsAll(given)) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        if (given.equals(expected)) {
            return GradeOutcome.auto(max, max);
        }
        if (!question.path("scoringConfig").path("partial").asBoolean(false)) {
            return GradeOutcome.auto(BigDecimal.ZERO, max);
        }
        int correct = 0;
        for (int index = 0; index < expected.size(); index++) {
            if (expected.get(index).equals(given.get(index))) {
                correct++;
            }
        }
        return GradeOutcome.auto(AnswerTexts.share(max, correct, expected.size()), max);
    }

    @Override
    public void sanitize(ObjectNode publicQuestion) {
        if (!(publicQuestion.get("options") instanceof ObjectNode options)) {
            return;
        }
        if (options.path("items").isArray()) {
            options.set("items", shuffled(options.path("items"), publicQuestion.path("id").asText()));
        }
        if (options.path("distractors").isArray()) {
            options.set("distractors", shuffled(options.path("distractors"), publicQuestion.path("id").asText() + "-d"));
        }
    }

    private List<String> values(JsonNode array) {
        List<String> values = new ArrayList<>();
        if (array.isArray()) {
            array.forEach(value -> {
                if (value == null || value.isNull()) {
                    values.add("");
                } else {
                    values.add(value.asText(""));
                }
            });
        }
        return values;
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        List<String> expected = values(question.path("answerKey").path("order"));
        List<String> given = values(answer.path("order"));
        if (given.isEmpty() || given.stream().allMatch(String::isBlank)) {
            return ContentNodes.object().put("_", "empty");
        }
        return ContentNodes.object().put("_", given.equals(expected) ? "correct" : "wrong");
    }
}
