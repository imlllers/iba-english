package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.media.MediaService;
import org.junit.jupiter.api.Test;

import java.util.OptionalInt;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PartPauseResolverTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readingCapFromQuestionSettings() {
        UUID partId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        ObjectNode snapshot = mapper.createObjectNode();
        ObjectNode section = snapshot.putArray("sections").addObject();
        section.putArray("materialBlocks");
        ObjectNode question = section.putArray("questions").addObject();
        question.put("id", questionId.toString());
        question.put("partId", partId.toString());
        question.putObject("settings").put("readingSeconds", 45);

        MediaService media = mock(MediaService.class);
        PartPauseResolver resolver = new PartPauseResolver(media);

        assertEquals(45, resolver.resolveMaxSeconds(snapshot, partId, "reading:" + questionId));
    }

    @Test
    void rejectsKeyFromAnotherPart() {
        UUID partId = UUID.randomUUID();
        UUID otherPart = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        ObjectNode snapshot = mapper.createObjectNode();
        ObjectNode section = snapshot.putArray("sections").addObject();
        section.putArray("materialBlocks");
        ObjectNode question = section.putArray("questions").addObject();
        question.put("id", questionId.toString());
        question.put("partId", otherPart.toString());
        question.putObject("settings").put("readingSeconds", 45);

        MediaService media = mock(MediaService.class);
        PartPauseResolver resolver = new PartPauseResolver(media);

        assertThrows(ApiException.class, () -> resolver.resolveMaxSeconds(snapshot, partId, "reading:" + questionId));
    }

    @Test
    void questionAudioUsesMediaServiceNotClient() {
        UUID partId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID mediaId = UUID.randomUUID();
        ObjectNode snapshot = mapper.createObjectNode();
        ObjectNode section = snapshot.putArray("sections").addObject();
        section.putArray("materialBlocks");
        ObjectNode question = section.putArray("questions").addObject();
        question.put("id", questionId.toString());
        question.put("partId", partId.toString());
        ObjectNode settings = question.putObject("settings");
        ObjectNode item = settings.putArray("content").addObject();
        item.put("id", "a1");
        item.put("kind", "audio");
        item.put("mediaId", mediaId.toString());

        MediaService media = mock(MediaService.class);
        when(media.durationSecondsForPause(mediaId)).thenReturn(OptionalInt.of(17));
        PartPauseResolver resolver = new PartPauseResolver(media);

        assertEquals(17, resolver.resolveMaxSeconds(snapshot, partId, "question:" + questionId + ":a1"));
        assertEquals(17, resolver.resolveMaxSeconds(snapshot, partId, "question:" + questionId + ":a1"));
    }

    @Test
    void fallsBackToPartLimitWhenDurationUnknown() {
        UUID partId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID mediaId = UUID.randomUUID();
        ObjectNode snapshot = mapper.createObjectNode();
        ObjectNode section = snapshot.putArray("sections").addObject();
        ObjectNode part = section.putArray("parts").addObject();
        part.put("id", partId.toString());
        part.put("timeLimitSeconds", 390);
        section.putArray("materialBlocks");
        ObjectNode question = section.putArray("questions").addObject();
        question.put("id", questionId.toString());
        question.put("partId", partId.toString());
        ObjectNode settings = question.putObject("settings");
        ObjectNode item = settings.putArray("content").addObject();
        item.put("id", "a1");
        item.put("kind", "audio");
        item.put("mediaId", mediaId.toString());

        MediaService media = mock(MediaService.class);
        when(media.durationSecondsForPause(mediaId)).thenReturn(OptionalInt.empty());
        PartPauseResolver resolver = new PartPauseResolver(media);

        assertEquals(390, resolver.resolveMaxSeconds(snapshot, partId, "question:" + questionId + ":a1"));
    }
}