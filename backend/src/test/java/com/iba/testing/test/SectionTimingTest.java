package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SectionTimingTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void prefersSecondsOverMinutes() {
        ObjectNode section = mapper.createObjectNode();
        section.put("timeLimitMinutes", 10);
        section.put("timeLimitSeconds", 390);
        assertEquals(390, SectionTiming.limitSeconds(section));
    }
}