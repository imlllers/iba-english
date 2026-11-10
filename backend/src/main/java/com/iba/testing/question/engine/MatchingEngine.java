package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
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
import static com.iba.testing.question.engine.ContentNodes.shuffled;

@Component
public class MatchingEngine implements QuestionEngine {

    @Override
    public Engine engine() {
        return Engine.MATCHING;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        titles(options, "", "");
        options.set("left", items());
        options.set("right", items());
        options.put("allowReuse", false);
        question.setOptions(options);
        ObjectNode key = object();
        key.putObject("pairs");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerPair", 1).put("partial", true));
    }

    @Override
    public void demoFill(Question question) {
        String l1 = id();
        String l2 = id();
        String l3 = id();
        String r1 = id();
        String r2 = id();
        String r3 = id();
        ObjectNode options = object();
        ObjectNode key = object();
        setInstructions(question, "Match each word with its definition. There is one extra definition.");
        question.setPromptContent(doc(paragraph()));
        titles(options, "Words", "Definitions");
        options.set("left", items(item(l1, "reliable"), item(l2, "generous"), item(l3, "curious")));
        options.set("right", items(item(r1, "able to be trusted"), item(r2, "happy to give more than expected"),
                item(r3, "eager to learn about something"), item(id(), "very tired")));
        options.put("allowReuse", false);
        key.set("pairs", object().put(l1, r1).put(l2, r2).put(l3, r3));
        question.setOptions(options);
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerPair", 1).put("partial", true));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.options(), "options");
        check.text(draft.options().get("leftTitle"), "options", "Заголовок колонки");
        check.text(draft.options().get("rightTitle"), "options", "Заголовок колонки");
        Set<String> left = check.items(draft.options().path("left"), "options", "Левая колонка", 1);
        Set<String> right = check.items(draft.options().path("right"), "options", "Правая колонка", 1);
        for (JsonNode item : draft.options().path("left")) {
            JsonNode media = item.get("mediaId");
            check.shape(media == null || media.isTextual(), "options", "Некорректный аудиофайл элемента");
        }
        check.object(draft.answerKey(), "answerKey");
        JsonNode pairs = draft.answerKey().path("pairs");
        check.shape(pairs.isMissingNode() || pairs.isObject(), "answerKey", "Некорректные пары");
        Set<String> used = new HashSet<>();
        boolean unique = true;
        for (String id : left) {
            String value = pairs.path(id).asText("");
            check.complete(right.contains(value), "answerKey", "Сопоставьте каждый элемент левой колонки");
            unique = unique && (value.isEmpty() || used.add(value));
        }
        check.complete(unique || draft.options().path("allowReuse").asBoolean(false), "answerKey",
                "Один ответ выбран для нескольких элементов. Разрешите повторное использование или выберите разные");
        check.points(draft.scoringConfig(), "pointsPerPair");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerPair", BigDecimal.ONE);
        return AnswerTexts.times(each, question.path("options").path("left").size());
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerPair", BigDecimal.ONE);
        JsonNode expected = question.path("answerKey").path("pairs");
        JsonNode left = question.path("options").path("left");
        int correct = 0;
        for (JsonNode item : left) {
            String id = item.path("id").asText();
            String given = answer.path("pairs").path(id).asText("");
            if (!given.isBlank() && given.equals(expected.path(id).asText())) {
                correct++;
            }
        }
        BigDecimal max = maxScore(question);
        if (!question.path("scoringConfig").path("partial").asBoolean(true)) {
            return GradeOutcome.auto(correct == left.size() && correct > 0 ? max : BigDecimal.ZERO, max);
        }
        return GradeOutcome.auto(AnswerTexts.times(each, correct), max);
    }

    @Override
    public void sanitize(ObjectNode publicQuestion) {
        if (publicQuestion.get("options") instanceof ObjectNode options && options.path("right").isArray()) {
            ArrayNode right = shuffled(options.path("right"), publicQuestion.path("id").asText());
            options.set("right", right);
        }
    }

    private void titles(ObjectNode options, String left, String right) {
        options.put("leftTitle", left);
        options.put("rightTitle", right);
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        ObjectNode marks = ContentNodes.object();
        JsonNode expected = question.path("answerKey").path("pairs");
        for (JsonNode item : question.path("options").path("left")) {
            String id = item.path("id").asText();
            String given = answer.path("pairs").path(id).asText("");
            marks.put(id, AnswerTexts.mark(!given.isBlank(), !given.isBlank() && given.equals(expected.path(id).asText())));
        }
        return marks;
    }
}
