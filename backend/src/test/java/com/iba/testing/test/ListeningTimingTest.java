package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ListeningTimingTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void questionLimitFromQuestionSettings() {
        ObjectNode question = mapper.createObjectNode();
        question.putObject("settings").put("timeLimitSeconds", 30);
        assertEquals(30, ListeningTiming.questionLimit(question));
    }

    @Test
    void questionLimitMissingOrZero() {
        assertEquals(0, ListeningTiming.questionLimit(mapper.createObjectNode()));
        ObjectNode question = mapper.createObjectNode();
        question.putObject("settings").put("timeLimitSeconds", 0);
        assertEquals(0, ListeningTiming.questionLimit(question));
    }

    @Test
    void toeicListeningUsesQuestionSettings() {
        ObjectNode section = mapper.createObjectNode();
        section.put("sectionType", "LISTENING");
        ObjectNode question = mapper.createObjectNode();
        question.putObject("settings").put("timeLimitSeconds", 15);
        assertEquals(15, ListeningTiming.questionLimit("TOEIC", section, question));
    }

    @Test
    void toeicListeningIgnoresPartPauseFields() {
        ObjectNode section = mapper.createObjectNode();
        section.put("sectionType", "LISTENING");
        ArrayNode parts = section.putArray("parts");
        ObjectNode part = parts.addObject();
        part.put("id", "p1");
        part.put("answerPauseSeconds", 8);
        ObjectNode question = mapper.createObjectNode();
        question.put("partId", "p1");
        question.putObject("settings").put("timeLimitSeconds", 12);
        assertEquals(12, ListeningTiming.questionLimit("TOEIC", section, question));
    }
}