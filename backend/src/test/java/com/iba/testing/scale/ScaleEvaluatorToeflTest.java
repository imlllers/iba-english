package com.iba.testing.scale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScaleEvaluatorToeflTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void normalizesRawScoreToThirtyPointTable() throws Exception {
        ObjectNode section = mapper.createObjectNode();
        section.put("min", 1);
        section.put("max", 6);
        section.put("step", 0.5);
        ObjectNode convert = section.putObject("convert");
        convert.put("method", "table");
        convert.put("rawMax", 30);
        ArrayNode table = convert.putArray("table");
        table.addObject().put("from", 29).put("to", 30).put("score", 6);
        table.addObject().put("from", 0).put("to", 0).put("score", 1);

        Method method = ScaleEvaluator.class.getDeclaredMethod(
                "convert",
                com.fasterxml.jackson.databind.JsonNode.class,
                double.class,
                double.class,
                String.class,
                String.class);
        method.setAccessible(true);
        assertEquals(6.0, method.invoke(null, section, 40.0, 40.0, "toefl", "TOEFL"));
        assertEquals(6.0, method.invoke(null, section, 30.0, 30.0, "toefl-copy", "TOEFL"));
        assertEquals(6.0, method.invoke(null, section, 10.0, 10.0, "other-scale", "TOEFL"));
    }
}