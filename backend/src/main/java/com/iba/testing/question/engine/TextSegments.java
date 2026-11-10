package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.node.ArrayNode;

import static com.iba.testing.question.engine.ContentNodes.array;
import static com.iba.testing.question.engine.ContentNodes.item;

public final class TextSegments {

    private TextSegments() {
    }

    public static ArrayNode split(String text, String unit) {
        String[] parts = "SENTENCE".equals(unit)
                ? text.trim().split("(?<=[.!?])\\s+")
                : text.trim().split("\\s+");
        ArrayNode segments = array();
        int index = 0;
        for (String part : parts) {
            if (!part.isBlank()) {
                segments.add(item("s" + index++, part));
            }
        }
        return segments;
    }
}
