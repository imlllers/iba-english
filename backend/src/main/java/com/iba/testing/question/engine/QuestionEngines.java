package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class QuestionEngines {

    private static final int MAX_DRAFT_CHARS = 400_000;
    private static final Pattern MEDIA_ID = Pattern.compile("^$|^[0-9a-fA-F-]{36}$");

    private final Map<Engine, QuestionEngine> engines = new EnumMap<>(Engine.class);

    public QuestionEngines(List<QuestionEngine> list) {
        for (QuestionEngine engine : list) {
            engines.put(engine.engine(), engine);
        }
        for (Engine engine : Engine.values()) {
            if (!engines.containsKey(engine)) {
                throw new IllegalStateException("Missing question engine " + engine);
            }
        }
    }

    public QuestionType parse(String name) {
        try {
            return QuestionType.canonicalize(name);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_TYPE", "Неизвестный тип задания");
        }
    }

    public void applyDefaults(Question question, QuestionType type) {
        question.setType(type);
        question.setRequired(true);
        question.setPromptContent(ContentNodes.doc());
        question.setOptions(ContentNodes.object());
        question.setAnswerKey(ContentNodes.object());
        question.setSettings(ContentNodes.object());
        engine(type).fill(question);
    }

    public void applyDemoDefaults(Question question, QuestionType type) {
        question.setType(type);
        question.setRequired(true);
        question.setPromptContent(ContentNodes.doc());
        question.setOptions(ContentNodes.object());
        question.setAnswerKey(ContentNodes.object());
        question.setSettings(ContentNodes.object());
        engine(type).demoFill(question);
    }

    public void validate(QuestionDraft draft, ContentCheck check) {
        check.object(draft.promptContent(), "promptContent");
        check.shape("doc".equals(draft.promptContent().path("type").asText()), "promptContent", "Текст задания должен быть документом редактора");
        check.shape(draft.options() != null && (draft.options().isObject() || draft.options().isArray()), "options", "Некорректные варианты");
        check.object(draft.answerKey(), "answerKey");
        check.object(draft.scoringConfig(), "scoringConfig");
        check.object(draft.settings(), "settings");
        int size = draft.promptContent().toString().length() + draft.options().toString().length()
                + draft.answerKey().toString().length() + draft.settings().toString().length();
        check.shape(size <= MAX_DRAFT_CHARS, "promptContent", "Задание слишком большое");
        JsonNode media = draft.settings().path("mediaId");
        check.shape(media.isMissingNode() || media.isNull() || (media.isTextual() && MEDIA_ID.matcher(media.asText()).matches()),
                "settings", "Некорректный файл задания");
        JsonNode content = draft.settings().path("content");
        if (!content.isMissingNode()) {
            check.contentItems(content, "settings");
        }
        JsonNode limit = draft.settings().path("playbackLimit");
        check.shape(limit.isMissingNode() || (limit.isInt() && limit.asInt() >= 0 && limit.asInt() <= 10),
                "settings", "Число прослушиваний должно быть от 0 до 10");
        engine(draft.type()).validate(draft, check);
    }

    public void validateStored(Question question, ContentCheck check) {
        validate(new QuestionDraft(question.getType(), question.getPromptContent(), question.getOptions(),
                question.getAnswerKey(), question.getScoringConfig(), question.getSettings()), check);
    }

    public GradeOutcome grade(JsonNode question, JsonNode answer) {
        JsonNode safe = answer == null || !answer.isObject() ? ContentNodes.object() : answer;
        return engine(parse(question.path("type").asText(""))).grade(question, safe);
    }

    public GradeOutcome grade(JsonNode question, JsonNode answer, String examType) {
        return grade(examScoring(question, examType), answer);
    }

    public static boolean officialExam(String examType) {
        return "IELTS".equals(examType) || "TOEFL".equals(examType) || "TOEIC".equals(examType);
    }

    public static BigDecimal manualBandMax(String examType) {
        return switch (examType == null ? "" : examType) {
            case "IELTS" -> BigDecimal.valueOf(9);
            case "TOEFL" -> BigDecimal.valueOf(5);
            default -> null;
        };
    }

    public boolean manualEngine(JsonNode question) {
        Engine engine = parse(question.path("type").asText("")).engine();
        return engine == Engine.WRITTEN || engine == Engine.SPEAKING;
    }

    private JsonNode examScoring(JsonNode question, String examType) {
        if (!officialExam(examType)) {
            return question;
        }
        Engine engine = parse(question.path("type").asText("")).engine();
        if (engine == Engine.WRITTEN || engine == Engine.SPEAKING) {
            BigDecimal band = manualBandMax(examType);
            if (band == null) {
                return question;
            }
            ObjectNode copy = question.deepCopy();
            ObjectNode scoring = copy.get("scoringConfig") instanceof ObjectNode object ? object : copy.putObject("scoringConfig");
            scoring.put("maxPoints", band);
            if (copy.get("settings") instanceof ObjectNode settings) {
                settings.putArray("criteria");
            }
            return copy;
        }
        ObjectNode copy = question.deepCopy();
        ObjectNode scoring = copy.get("scoringConfig") instanceof ObjectNode object ? object : copy.putObject("scoringConfig");
        scoring.put("negativePoints", 0);
        switch (engine) {
            case JUDGEMENT -> scoring.put("pointsPerStatement", 1);
            case INLINE -> scoring.put("pointsPerBlank", 1);
            case ERROR_HUNT -> scoring.put("pointsPerError", 1);
            case MATCHING -> scoring.put("pointsPerPair", 1).put("partial", true);
            case MULTI_CHOICE -> {
                int correct = question.path("answerKey").path("correctOptionIds").size();
                boolean perAnswer = "IELTS".equals(examType) && correct > 1;
                scoring.put("points", perAnswer ? correct : 1).put("partial", perAnswer);
            }
            default -> scoring.put("points", 1);
        }
        return copy;
    }

    public BigDecimal maxScore(JsonNode question) {
        return engine(parse(question.path("type").asText(""))).maxScore(question);
    }

    public ObjectNode marks(JsonNode question, JsonNode answer) {
        JsonNode safe = answer == null || !answer.isObject() ? ContentNodes.object() : answer;
        return engine(parse(question.path("type").asText(""))).marks(question, safe);
    }

    public ObjectNode publicQuestion(JsonNode question) {
        ObjectNode copy = question.deepCopy();
        if ("MULTIPLE_SELECT".equals(copy.path("type").asText(""))) {
            JsonNode correct = copy.path("answerKey").path("correctOptionIds");
            if (correct.isArray() && correct.size() > 0) {
                ObjectNode settings = copy.get("settings") instanceof ObjectNode object
                        ? object
                        : copy.putObject("settings");
                settings.put("selectCount", correct.size());
            }
        }
        engine(parse(question.path("type").asText(""))).publicHints(copy);
        copy.remove("answerKey");
        copy.remove("title");
        if (copy.get("settings") instanceof ObjectNode settings) {
            settings.remove("errorExplanation");
        }
        engine(parse(question.path("type").asText(""))).sanitize(copy);
        return copy;
    }

    private QuestionEngine engine(QuestionType type) {
        return engines.get(type.engine());
    }
}
