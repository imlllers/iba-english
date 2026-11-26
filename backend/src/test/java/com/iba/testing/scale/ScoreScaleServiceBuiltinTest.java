package com.iba.testing.scale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoreScaleServiceBuiltinTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final ScoreScaleService service = new ScoreScaleService(null, mapper);

  @Test
  void builtinIelts() {
    JsonNode scale = service.starterCopy("ielts");
    assertNotNull(scale);
    assertEquals(4, scale.path("sections").size());
    assertEquals("SPEAKING", scale.path("sections").get(3).path("sectionType").asText());
    assertEquals("manual", scale.path("sections").get(3).path("convert").path("method").asText());
  }

  @Test
  void builtinToefl() {
    JsonNode scale = service.starterCopy("toefl");
    assertNotNull(scale);
    assertEquals("average", scale.path("aggregate").asText());
    assertEquals(0.5, scale.path("round").path("step").asDouble(), 1e-9);
    var sections = scale.path("sections");
    assertEquals(4, sections.size());
    assertEquals("READING", sections.get(0).path("sectionType").asText());
    assertEquals("LISTENING", sections.get(1).path("sectionType").asText());
    assertEquals("WRITING", sections.get(2).path("sectionType").asText());
    assertEquals("SPEAKING", sections.get(3).path("sectionType").asText());
    for (int i = 0; i < 4; i++) {
      assertEquals(1, sections.get(i).path("min").asDouble(), 1e-9);
      assertEquals(6, sections.get(i).path("max").asDouble(), 1e-9);
      assertEquals(0.5, sections.get(i).path("step").asDouble(), 1e-9);
    }
    assertEquals("table", sections.get(0).path("convert").path("method").asText());
    assertEquals("table", sections.get(1).path("convert").path("method").asText());
    assertEquals("manual", sections.get(2).path("convert").path("method").asText());
    assertEquals("manual", sections.get(3).path("convert").path("method").asText());
    assertEquals(30, sections.get(0).path("convert").path("rawMax").asInt());
    boolean hasC2Max6 = false;
    for (JsonNode level : scale.path("levels")) {
      if ("C2".equals(level.path("label").asText())) {
        assertEquals(6, level.path("max").asDouble(), 1e-9);
        hasC2Max6 = true;
      }
    }
    assertTrue(hasC2Max6);
  }

  @Test
  void noLegacyToeflScale() {
    assertNull(service.starterCopy("toefl-legacy"));
  }

  @Test
  void builtinToeic() {
    JsonNode scale = service.starterCopy("toeic");
    assertNotNull(scale);
    assertEquals("TOEIC Listening & Reading", scale.path("title").asText());
    assertEquals("sum", scale.path("aggregate").asText());
    assertEquals(2, scale.path("sections").size());
    for (JsonNode level : scale.path("levels")) {
      assertTrue(!"C2".equals(level.path("label").asText()));
    }
    boolean hasA1 = false;
    for (JsonNode level : scale.path("levels")) {
      if ("A1".equals(level.path("label").asText())) {
        assertEquals(120, level.path("min").asDouble(), 1e-9);
        hasA1 = true;
      }
      if ("C1".equals(level.path("label").asText())) {
        assertEquals(945, level.path("min").asDouble(), 1e-9);
        assertEquals(990, level.path("max").asDouble(), 1e-9);
      }
    }
    assertTrue(hasA1);
  }

  @Test
  void builtinToeicSw() {
    JsonNode scale = service.starterCopy("toeic_sw");
    assertNotNull(scale);
    assertEquals("TOEIC", scale.path("examType").asText());
    assertEquals("sum", scale.path("aggregate").asText());
    assertEquals(2, scale.path("sections").size());
    assertEquals("SPEAKING", scale.path("sections").get(0).path("sectionType").asText());
    assertEquals("WRITING", scale.path("sections").get(1).path("sectionType").asText());
    for (int i = 0; i < 2; i++) {
      assertEquals(0, scale.path("sections").get(i).path("min").asDouble(), 1e-9);
      assertEquals(200, scale.path("sections").get(i).path("max").asDouble(), 1e-9);
      assertEquals(10, scale.path("sections").get(i).path("step").asDouble(), 1e-9);
      assertEquals("manual", scale.path("sections").get(i).path("convert").path("method").asText());
    }
    assertTrue(scale.path("levels").isEmpty());
  }
}