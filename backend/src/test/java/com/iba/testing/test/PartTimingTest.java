package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PartTimingTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void secondsTakePriorityOverMinutes() {
        ObjectNode part = mapper.createObjectNode();
        part.put("timeLimitMinutes", 10);
        part.put("timeLimitSeconds", 390);
        assertEquals(390, PartTiming.limitSeconds(part));
    }

    @Test
    void minutesConvertedToSeconds() {
        ObjectNode part = mapper.createObjectNode();
        part.put("timeLimitMinutes", 9);
        assertEquals(540, PartTiming.limitSeconds(part));
    }
}