package com.iba.testing.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResultDisplayTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void scaleMode() {
        ObjectNode settings = mapper.createObjectNode();
        settings.put("resultDetail", "score_and_scale");
        assertTrue(ResultDisplay.showsScale(settings));
        assertTrue(ResultDisplay.showsOverall(settings));
        assertEquals("score_and_scale", ResultDisplay.normalizeDetail(settings));
    }

    @Test
    void sectionsOnlyMode() {
        ObjectNode settings = mapper.createObjectNode();
        settings.put("resultDetail", "sections_only");
        assertEquals("sections_only", ResultDisplay.normalizeDetail(settings));
        assertTrue(ResultDisplay.showsScale(settings));
        assertFalse(ResultDisplay.showsOverall(settings));
    }

    @Test
    void normalizesLegacyValues() {
        ObjectNode settings = mapper.createObjectNode();
        settings.put("resultDetail", "score_review_and_scale");
        assertEquals("score_and_scale", ResultDisplay.normalizeDetail(settings));
        settings.put("resultDetail", "score_and_review");
        assertEquals("score_only", ResultDisplay.normalizeDetail(settings));
        assertFalse(ResultDisplay.showsScale(settings));
    }
}