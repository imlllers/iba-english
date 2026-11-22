package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.media.MediaService;
import com.iba.testing.test.PartTiming;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.OptionalInt;
import java.util.UUID;

@Component
public class PartPauseResolver {

    private final MediaService media;

    public PartPauseResolver(MediaService media) {
        this.media = media;
    }

    public int resolveMaxSeconds(JsonNode snapshot, UUID partId, String audioKey) {
        String partKey = partId.toString();
        if (audioKey.startsWith("reading:")) {
            String questionId = audioKey.substring("reading:".length()).trim();
            if (questionId.isEmpty()) {
                throw validation("Некорректный ключ reading");
            }
            JsonNode question = findQuestion(snapshot, questionId);
            if (question == null || !partKey.equals(questionPartId(question))) {
                throw validation("Вопрос не в этой части");
            }
            int reading = question.path("settings").path("readingSeconds").asInt(0);
            if (reading <= 0) {
                throw validation("У вопроса нет фазы reading");
            }
            return reading;
        }
        if (audioKey.startsWith("block:")) {
            String itemId = audioKey.substring("block:".length()).trim();
            UUID mediaId = findBlockItemMedia(snapshot, partKey, itemId);
            if (mediaId == null) {
                throw validation("Аудио не в этой части");
            }
            return durationOrPartLimit(snapshot, partId, mediaId);
        }
        if (audioKey.startsWith("question:")) {
            String rest = audioKey.substring("question:".length());
            int colon = rest.indexOf(':');
            if (colon <= 0 || colon >= rest.length() - 1) {
                throw validation("Некорректный ключ question");
            }
            String questionId = rest.substring(0, colon);
            String itemId = rest.substring(colon + 1);
            JsonNode question = findQuestion(snapshot, questionId);
            if (question == null || !partKey.equals(questionPartId(question))) {
                throw validation("Вопрос не в этой части");
            }
            UUID mediaId = findAudioItemMedia(question, itemId);
            if (mediaId == null) {
                throw validation("Аудио не найдено в вопросе");
            }
            return durationOrPartLimit(snapshot, partId, mediaId);
        }
        throw validation("Неизвестный audioKey");
    }

    private int durationOrPartLimit(JsonNode snapshot, UUID partId, UUID mediaId) {
        OptionalInt duration = media.durationSecondsForPause(mediaId);
        if (duration.isPresent() && duration.getAsInt() > 0) {
            return duration.getAsInt();
        }
        return PartTiming.limitSeconds(findPart(snapshot, partId));
    }

    private static JsonNode findPart(JsonNode snapshot, UUID partId) {
        String partKey = partId.toString();
        for (JsonNode section : snapshot.path("sections")) {
            for (JsonNode part : section.path("parts")) {
                if (partKey.equals(part.path("id").asText())) {
                    return part;
                }
            }
        }
        return null;
    }

    private static ApiException validation(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", message);
    }

    private static JsonNode findQuestion(JsonNode snapshot, String questionId) {
        for (JsonNode section : snapshot.path("sections")) {
            for (JsonNode question : section.path("questions")) {
                if (questionId.equals(question.path("id").asText())) {
                    return question;
                }
            }
        }
        return null;
    }

    private static String questionPartId(JsonNode question) {
        JsonNode partId = question.path("partId");
        return partId.isNull() || partId.isMissingNode() ? "" : partId.asText("");
    }

    private static UUID findBlockItemMedia(JsonNode snapshot, String partKey, String itemId) {
        for (JsonNode section : snapshot.path("sections")) {
            for (JsonNode block : section.path("materialBlocks")) {
                String blockPart = block.path("partId").isNull() ? "" : block.path("partId").asText("");
                if (!Objects.equals(partKey, blockPart)) {
                    continue;
                }
                UUID mediaId = audioMediaId(block.path("items"), itemId);
                if (mediaId != null) {
                    return mediaId;
                }
                if (itemId.equals(block.path("id").asText() + "-media")) {
                    String legacy = block.path("mediaId").asText("");
                    if (block.path("mediaKind").asText("").equals("audio") && !legacy.isBlank()) {
                        return UUID.fromString(legacy);
                    }
                }
            }
        }
        return null;
    }

    private static UUID findAudioItemMedia(JsonNode question, String itemId) {
        JsonNode settings = question.path("settings");
        UUID fromContent = audioMediaId(settings.path("content"), itemId);
        if (fromContent != null) {
            return fromContent;
        }
        if (itemId.equals(question.path("id").asText() + "-media")) {
            String legacy = settings.path("mediaId").asText("");
            if ("audio".equals(settings.path("mediaKind").asText("")) && !legacy.isBlank()) {
                return UUID.fromString(legacy);
            }
        }
        return null;
    }

    private static UUID audioMediaId(JsonNode items, String itemId) {
        if (!items.isArray()) {
            return null;
        }
        for (JsonNode item : items) {
            if (!itemId.equals(item.path("id").asText())) {
                continue;
            }
            if (!"audio".equals(item.path("kind").asText(""))) {
                return null;
            }
            String media = item.path("mediaId").asText("");
            if (media.isBlank()) {
                return null;
            }
            return UUID.fromString(media);
        }
        return null;
    }
}