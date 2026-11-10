package com.iba.testing.question.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

public final class ContentNodes {

    private static final JsonNodeFactory NODES = JsonNodeFactory.instance;

    private ContentNodes() {
    }

    public static String id() {
        return UUID.randomUUID().toString();
    }

    public static ObjectNode object() {
        return NODES.objectNode();
    }

    public static void setInstructions(Question question, String instructions) {
        JsonNode current = question.getSettings();
        ObjectNode settings = current != null && current.isObject() ? ((ObjectNode) current).deepCopy() : object();
        if (instructions == null || instructions.isBlank()) {
            settings.remove("instructions");
        } else {
            settings.put("instructions", instructions);
        }
        question.setSettings(settings);
    }

    public static ArrayNode array() {
        return NODES.arrayNode();
    }

    public static ObjectNode doc(JsonNode... blocks) {
        ObjectNode doc = object();
        doc.put("type", "doc");
        ArrayNode content = doc.putArray("content");
        for (JsonNode block : blocks) {
            content.add(block);
        }
        if (blocks.length == 0) {
            content.addObject().put("type", "paragraph");
        }
        return doc;
    }

    public static ObjectNode paragraph(Object... parts) {
        ObjectNode paragraph = object();
        paragraph.put("type", "paragraph");
        if (parts.length > 0) {
            ArrayNode content = paragraph.putArray("content");
            for (Object part : parts) {
                if (part instanceof JsonNode node) {
                    content.add(node);
                } else {
                    content.addObject().put("type", "text").put("text", String.valueOf(part));
                }
            }
        }
        return paragraph;
    }

    public static ObjectNode heading(String text) {
        ObjectNode heading = paragraph(text);
        heading.put("type", "heading");
        heading.putObject("attrs").put("level", 2);
        return heading;
    }

    public static ObjectNode bulletList(ObjectNode... paragraphs) {
        ObjectNode list = object();
        list.put("type", "bulletList");
        ArrayNode items = list.putArray("content");
        for (ObjectNode paragraph : paragraphs) {
            ObjectNode item = items.addObject();
            item.put("type", "listItem");
            item.putArray("content").add(paragraph);
        }
        return list;
    }

    public static ObjectNode table(List<? extends List<?>> rows) {
        ObjectNode table = object();
        table.put("type", "table");
        ArrayNode tableRows = table.putArray("content");
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            ObjectNode row = tableRows.addObject();
            row.put("type", "tableRow");
            ArrayNode cells = row.putArray("content");
            for (Object value : rows.get(rowIndex)) {
                ObjectNode cell = cells.addObject();
                cell.put("type", rowIndex == 0 ? "tableHeader" : "tableCell");
                cell.putArray("content").add(paragraph(value));
            }
        }
        return table;
    }

    public static ObjectNode blank(String id) {
        ObjectNode blank = object();
        blank.put("type", "blank");
        blank.putObject("attrs").put("id", id);
        return blank;
    }

    public static ObjectNode item(String id, String text) {
        ObjectNode item = object();
        item.put("id", id);
        item.put("text", text);
        return item;
    }

    public static ArrayNode items(ObjectNode... items) {
        ArrayNode array = array();
        for (ObjectNode item : items) {
            array.add(item);
        }
        return array;
    }

    public static ArrayNode strings(String... values) {
        ArrayNode array = array();
        for (String value : values) {
            array.add(value);
        }
        return array;
    }

    public static ObjectNode textRule(String... accepted) {
        ObjectNode rule = object();
        rule.set("accepted", strings(accepted));
        rule.put("caseInsensitive", true);
        rule.put("normalizeSpaces", true);
        return rule;
    }

    public static ObjectNode criterion(String id, String label, int maxPoints) {
        ObjectNode criterion = object();
        criterion.put("id", id);
        criterion.put("label", label);
        criterion.put("maxPoints", maxPoints);
        return criterion;
    }

    public static List<String> blankIds(JsonNode node) {
        List<String> ids = new ArrayList<>();
        collectBlanks(node, ids);
        return ids;
    }

    public static Set<String> idSet(JsonNode array) {
        Set<String> ids = new HashSet<>();
        if (array != null && array.isArray()) {
            for (JsonNode item : array) {
                String id = item.path("id").asText("");
                if (!id.isBlank()) {
                    ids.add(id);
                }
            }
        }
        return ids;
    }

    public static ArrayNode shuffled(JsonNode source, String seed) {
        List<JsonNode> list = new ArrayList<>();
        source.forEach(list::add);
        List<JsonNode> original = List.copyOf(list);
        Collections.shuffle(list, new Random(seed.hashCode()));
        if (list.size() > 1 && list.equals(original)) {
            Collections.rotate(list, 1);
        }
        ArrayNode result = array();
        list.forEach(result::add);
        return result;
    }

    private static void collectBlanks(JsonNode node, List<String> ids) {
        if (node == null) {
            return;
        }
        if ("blank".equals(node.path("type").asText())) {
            String id = node.path("attrs").path("id").asText("");
            if (!id.isBlank() && !ids.contains(id)) {
                ids.add(id);
            }
        }
        if (node.isArray() || node.isObject()) {
            node.forEach(child -> collectBlanks(child, ids));
        }
    }
}
