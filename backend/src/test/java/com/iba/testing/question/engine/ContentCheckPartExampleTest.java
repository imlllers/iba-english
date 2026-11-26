package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ContentCheckPartExampleTest {

    private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void acceptsValidExample() {
    ObjectNode example = mapper.createObjectNode();
    ArrayNode blocks = example.putArray("blocks");
    ObjectNode text = blocks.addObject();
    text.put("id", "b1");
    text.put("kind", "text");
    text.putObject("doc").put("type", "doc");
    assertDoesNotThrow(() -> ContentCheck.draft().partExample(example, "example"));
  }

  @Test
  void rejectsTooManyChoices() {
    ObjectNode example = mapper.createObjectNode();
    ArrayNode blocks = example.putArray("blocks");
    ObjectNode choices = blocks.addObject();
    choices.put("id", "c1");
    choices.put("kind", "choices");
    choices.put("correctId", "o1");
    ArrayNode options = choices.putArray("options");
    for (int i = 0; i < 5; i++) {
      ObjectNode option = options.addObject();
      option.put("id", "o" + i);
      option.put("text", "Option");
    }
    assertThrows(ApiException.class, () -> ContentCheck.draft().partExample(example, "example"));
  }

  @Test
  void rejectsWrongCorrectId() {
    ObjectNode example = mapper.createObjectNode();
    ArrayNode blocks = example.putArray("blocks");
    ObjectNode choices = blocks.addObject();
    choices.put("id", "c1");
    choices.put("kind", "choices");
    choices.put("correctId", "missing");
    ArrayNode options = choices.putArray("options");
    ObjectNode a = options.addObject();
    a.put("id", "o1");
    a.put("text", "A");
    ObjectNode b = options.addObject();
    b.put("id", "o2");
    b.put("text", "B");
    assertThrows(ApiException.class, () -> ContentCheck.draft().partExample(example, "example"));
  }
}