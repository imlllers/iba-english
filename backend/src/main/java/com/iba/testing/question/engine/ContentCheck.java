package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class ContentCheck {

    private static final int MAX_ITEMS = 200;
    private static final int MAX_TEXT = 5000;
    private static final int MAX_CONTENT_ITEMS = 30;
    private static final Set<String> CONTENT_KINDS = Set.of("text", "audio", "video", "image");
    private static final Pattern MEDIA_ID = Pattern.compile("^$|^[0-9a-fA-F-]{36}$");

    private final boolean strict;

    private ContentCheck(boolean strict) {
        this.strict = strict;
    }

    public static ContentCheck draft() {
        return new ContentCheck(false);
    }

    public static ContentCheck publication() {
        return new ContentCheck(true);
    }

    public void shape(boolean condition, String field, String message) {
        if (!condition) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", message, Map.of(field, message));
        }
    }

    public void complete(boolean condition, String field, String message) {
        if (strict) {
            shape(condition, field, message);
        }
    }

    public void object(JsonNode node, String field) {
        shape(node != null && node.isObject(), field, "Некорректная структура задания");
    }

    public void points(JsonNode scoring, String field) {
        JsonNode value = scoring == null ? null : scoring.get(field);
        shape(value != null && value.isNumber() && value.decimalValue().compareTo(BigDecimal.ZERO) >= 0
                        && value.decimalValue().compareTo(BigDecimal.valueOf(1000)) <= 0,
                "scoringConfig", "Баллы должны быть числом от 0 до 1000");
    }

    public void optionalPoints(JsonNode scoring, String field) {
        if (scoring != null && scoring.has(field)) {
            points(scoring, field);
        }
    }

    public void text(JsonNode node, String field, String label) {
        shape(node == null || node.isMissingNode() || node.isNull() || (node.isTextual() && node.asText().length() <= MAX_TEXT),
                field, label + ": текст слишком длинный или некорректный");
    }

    public Set<String> items(JsonNode array, String field, String label, int min) {
        shape(array != null && array.isArray(), field, label + ": ожидается список");
        shape(array.size() <= MAX_ITEMS, field, label + ": слишком много элементов");
        Set<String> ids = new LinkedHashSet<>();
        boolean filled = true;
        for (JsonNode item : array) {
            shape(item.isObject(), field, label + ": некорректный элемент");
            String id = item.path("id").asText("");
            shape(!id.isBlank() && id.length() <= 100, field, label + ": у элемента нет идентификатора");
            shape(ids.add(id), field, label + ": идентификаторы повторяются");
            text(item.get("text"), field, label);
            if (item.path("text").asText("").isBlank()) {
                filled = false;
            }
        }
        complete(filled, field, label + ": заполните текст каждого элемента");
        complete(ids.size() >= min, field, label + ": нужно минимум " + min);
        return ids;
    }

    public void rule(JsonNode rule, String field, String message) {
        shape(rule != null && rule.isObject(), field, "Некорректное правило проверки");
        JsonNode accepted = rule.path("accepted");
        shape(accepted.isMissingNode() || accepted.isArray(), field, "Допустимые ответы должны быть списком");
        boolean any = false;
        for (JsonNode value : accepted) {
            shape(value.isTextual() && value.asText().length() <= MAX_TEXT, field, "Допустимый ответ слишком длинный");
            any = any || !value.asText().isBlank();
        }
        complete(any, field, message);
    }

    public void contentItems(JsonNode array, String field) {
        shape(array != null && array.isArray(), field, "Содержимое: ожидается список");
        shape(array.size() <= MAX_CONTENT_ITEMS, field, "Содержимое: слишком много элементов");
        Set<String> ids = new LinkedHashSet<>();
        for (JsonNode item : array) {
            shape(item.isObject(), field, "Содержимое: некорректный элемент");
            String id = item.path("id").asText("");
            shape(!id.isBlank() && id.length() <= 100 && ids.add(id), field, "Содержимое: некорректный идентификатор");
            String kind = item.path("kind").asText("");
            shape(CONTENT_KINDS.contains(kind), field, "Содержимое: неизвестный тип элемента");
            if ("text".equals(kind)) {
                JsonNode doc = item.path("doc");
                shape(doc.isMissingNode() || (doc.isObject() && "doc".equals(doc.path("type").asText())),
                        field, "Содержимое: текст должен быть документом редактора");
            } else {
                JsonNode media = item.path("mediaId");
                shape(media.isMissingNode() || media.isNull() || (media.isTextual() && MEDIA_ID.matcher(media.asText()).matches()),
                        field, "Содержимое: некорректный файл");
                complete(media.isTextual() && !media.asText().isBlank(), field, "Содержимое: выберите файл для каждого медиа");
            }
        }
    }

    public void criteria(JsonNode settings) {
        JsonNode criteria = settings.path("criteria");
        shape(criteria.isMissingNode() || criteria.isArray(), "settings", "Критерии должны быть списком");
        Set<String> ids = new LinkedHashSet<>();
        for (JsonNode criterion : criteria) {
            String id = criterion.path("id").asText("");
            shape(!id.isBlank() && ids.add(id), "settings", "У критерия должен быть уникальный идентификатор");
            text(criterion.get("label"), "settings", "Критерий");
            complete(!criterion.path("label").asText("").isBlank(), "settings", "Укажите название каждого критерия");
            points(criterion, "maxPoints");
        }
    }
}
