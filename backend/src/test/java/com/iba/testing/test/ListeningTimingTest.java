package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
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
}