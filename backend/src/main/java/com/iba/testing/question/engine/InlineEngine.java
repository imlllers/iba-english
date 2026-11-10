package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import static com.iba.testing.question.engine.ContentNodes.blank;
import static com.iba.testing.question.engine.ContentNodes.doc;
import static com.iba.testing.question.engine.ContentNodes.id;
import static com.iba.testing.question.engine.ContentNodes.item;
import static com.iba.testing.question.engine.ContentNodes.items;
import static com.iba.testing.question.engine.ContentNodes.object;
import static com.iba.testing.question.engine.ContentNodes.paragraph;
import static com.iba.testing.question.engine.ContentNodes.setInstructions;
import static com.iba.testing.question.engine.ContentNodes.textRule;

@Component
public class InlineEngine implements QuestionEngine {

    static final String GAP = "gap";
    static final String TAIL = "tail";
    static final String DROPDOWN = "dropdown";
    private static final Set<String> KINDS = Set.of(GAP, TAIL, DROPDOWN);
    private static final int MAX_PREFIX = 100;

    @Override
    public Engine engine() {
        return Engine.INLINE;
    }

    @Override
    public void fill(Question question) {
        question.setPromptContent(doc(paragraph()));
        ObjectNode options = object();
        options.putObject("choices");
        options.putObject("prefixes");
        question.setOptions(options);
        ObjectNode key = object();
        key.putObject("blanks");
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerBlank", 1));
    }

    @Override
    public void demoFill(Question question) {
        if (question.getType() == QuestionType.SENTENCE_GAPS) {
            String a = id();
            String b = id();
            String c = id();
            setInstructions(question, "Complete each sentence with ONE word.");
            question.setPromptContent(doc(
                    paragraph("I have lived in this city ", blank(a), " 2019."),
                    paragraph("She is very interested ", blank(b), " modern art."),
                    paragraph("We have run out ", blank(c), " milk.")));
            ObjectNode options = object();
            options.putObject("choices");
            options.putObject("prefixes");
            question.setOptions(options);
            ObjectNode key = object();
            ObjectNode blanks = key.putObject("blanks");
            blanks.set(a, textRule("since"));
            blanks.set(b, textRule("in"));
            blanks.set(c, textRule("of"));
            question.setAnswerKey(key);
            question.setScoringConfig(object().put("pointsPerBlank", 1));
            return;
        }
        String gap = id();
        String tail = id();
        String dropdown = id();
        String went = id();
        ObjectNode gapNode = inline(gap, GAP);
        ObjectNode tailNode = inline(tail, TAIL);
        ObjectNode dropdownNode = inline(dropdown, DROPDOWN);
        setInstructions(question, "Complete the text.");
        question.setPromptContent(doc(
                paragraph("Last summer we ", dropdownNode, " to the seaside. The weather was ", tailNode,
                        " and we swam ", gapNode, " day.")));
        ObjectNode options = object();
        options.putObject("choices").set(dropdown, items(item(went, "went"), item(id(), "go"), item(id(), "gone")));
        options.putObject("prefixes").put(tail, "beauti");
        question.setOptions(options);
        ObjectNode key = object();
        ObjectNode blanks = key.putObject("blanks");
        blanks.put(dropdown, went);
        blanks.set(tail, textRule("ful"));
        blanks.set(gap, textRule("every"));
        question.setAnswerKey(key);
        question.setScoringConfig(object().put("pointsPerBlank", 1));
    }

    @Override
    public void validate(QuestionDraft draft, ContentCheck check) {
        Map<String, String> blanks = blanks(draft.promptContent());
        check.complete(!blanks.isEmpty(), "promptContent", "Вставьте в текст хотя бы один пропуск");
        check.object(draft.options(), "options");
        check.object(draft.answerKey(), "answerKey");
        JsonNode choices = draft.options().path("choices");
        JsonNode prefixes = draft.options().path("prefixes");
        JsonNode key = draft.answerKey().path("blanks");
        check.shape(choices.isMissingNode() || choices.isObject(), "options", "Некорректные варианты пропусков");
        check.shape(prefixes.isMissingNode() || prefixes.isObject(), "options", "Некорректное начало слова");
        check.shape(key.isMissingNode() || key.isObject(), "answerKey", "Некорректные ответы для пропусков");
        for (Map.Entry<String, String> entry : blanks.entrySet()) {
            String id = entry.getKey();
            check.shape(KINDS.contains(entry.getValue()), "promptContent", "Неизвестный вид пропуска");
            if (DROPDOWN.equals(entry.getValue())) {
                JsonNode list = choices.get(id);
                check.complete(list != null, "options", "Добавьте варианты для каждого выпадающего списка");
                if (list != null) {
                    Set<String> optionIds = check.items(list, "options", "Варианты списка", 2);
                    check.complete(optionIds.contains(key.path(id).asText("")), "answerKey", "Отметьте верный вариант в каждом списке");
                }
                continue;
            }
            if (TAIL.equals(entry.getValue())) {
                JsonNode prefix = prefixes.get(id);
                check.shape(prefix == null || (prefix.isTextual() && prefix.asText().length() <= MAX_PREFIX),
                        "options", "Начало слова слишком длинное");
                check.complete(prefix != null && !prefix.asText("").isBlank(), "options", "Укажите начало слова для каждого «Дописать слово»");
            }
            JsonNode rule = key.get(id);
            check.complete(rule != null, "answerKey", "Для каждого пропуска укажите допустимый ответ");
            if (rule != null) {
                check.rule(rule, "answerKey", "Для каждого пропуска укажите допустимый ответ");
            }
        }
        check.points(draft.scoringConfig(), "pointsPerBlank");
    }

    @Override
    public BigDecimal maxScore(JsonNode question) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerBlank", BigDecimal.ONE);
        return AnswerTexts.times(each, blanks(question.path("promptContent")).size());
    }

    @Override
    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        BigDecimal each = AnswerTexts.points(question.get("scoringConfig"), "pointsPerBlank", BigDecimal.ONE);
        JsonNode key = question.path("answerKey").path("blanks");
        int correct = 0;
        for (Map.Entry<String, String> entry : blanks(question.path("promptContent")).entrySet()) {
            String given = answer.path("blanks").path(entry.getKey()).asText("");
            boolean right = DROPDOWN.equals(entry.getValue())
                    ? !given.isBlank() && given.equals(key.path(entry.getKey()).asText())
                    : AnswerTexts.ruleMatches(key.path(entry.getKey()), given);
            if (right) {
                correct++;
            }
        }
        return GradeOutcome.auto(AnswerTexts.times(each, correct), maxScore(question));
    }

    @Override
    public void publicHints(ObjectNode question) {
        if (!(question.get("options") instanceof ObjectNode options)) {
            return;
        }
        JsonNode key = question.path("answerKey").path("blanks");
        ObjectNode lengths = options.putObject("tailLengths");
        for (Map.Entry<String, String> entry : blanks(question.path("promptContent")).entrySet()) {
            if (!TAIL.equals(entry.getValue())) {
                continue;
            }
            for (JsonNode accepted : key.path(entry.getKey()).path("accepted")) {
                String text = accepted.asText("").trim();
                if (!text.isEmpty()) {
                    lengths.put(entry.getKey(), text.codePointCount(0, text.length()));
                    break;
                }
            }
        }
    }

    private static ObjectNode inline(String id, String kind) {
        ObjectNode node = blank(id);
        ((ObjectNode) node.get("attrs")).put("kind", kind);
        return node;
    }

    static Map<String, String> blanks(JsonNode node) {
        Map<String, String> result = new LinkedHashMap<>();
        collect(node, result);
        return result;
    }

    private static void collect(JsonNode node, Map<String, String> result) {
        if (node == null || node.isMissingNode()) {
            return;
        }
        if ("blank".equals(node.path("type").asText())) {
            String id = node.path("attrs").path("id").asText("");
            if (!id.isBlank()) {
                String kind = node.path("attrs").path("kind").asText("");
                result.putIfAbsent(id, kind.isBlank() ? GAP : kind);
            }
        }
        for (JsonNode child : node.path("content")) {
            collect(child, result);
        }
    }

    @Override
    public ObjectNode marks(JsonNode question, JsonNode answer) {
        ObjectNode marks = ContentNodes.object();
        JsonNode key = question.path("answerKey").path("blanks");
        for (Map.Entry<String, String> entry : blanks(question.path("promptContent")).entrySet()) {
            String given = answer.path("blanks").path(entry.getKey()).asText("");
            boolean right = DROPDOWN.equals(entry.getValue())
                    ? !given.isBlank() && given.equals(key.path(entry.getKey()).asText())
                    : AnswerTexts.ruleMatches(key.path(entry.getKey()), given);
            marks.put(entry.getKey(), AnswerTexts.mark(!given.isBlank(), right));
        }
        return marks;
    }
}
