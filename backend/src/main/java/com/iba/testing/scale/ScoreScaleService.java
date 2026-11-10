package com.iba.testing.scale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ScoreScaleService {

    private static final String IELTS_LISTENING = """
            [{"from":39,"to":40,"score":9},{"from":37,"to":38,"score":8.5},{"from":35,"to":36,"score":8},{"from":32,"to":34,"score":7.5},\
            {"from":30,"to":31,"score":7},{"from":26,"to":29,"score":6.5},{"from":23,"to":25,"score":6},{"from":18,"to":22,"score":5.5},\
            {"from":16,"to":17,"score":5},{"from":13,"to":15,"score":4.5},{"from":10,"to":12,"score":4},{"from":8,"to":9,"score":3.5},\
            {"from":6,"to":7,"score":3},{"from":4,"to":5,"score":2.5},{"from":2,"to":3,"score":2},{"from":0,"to":1,"score":1}]
            """;
    private static final String IELTS_READING = """
            [{"from":39,"to":40,"score":9},{"from":37,"to":38,"score":8.5},{"from":35,"to":36,"score":8},{"from":33,"to":34,"score":7.5},\
            {"from":30,"to":32,"score":7},{"from":27,"to":29,"score":6.5},{"from":23,"to":26,"score":6},{"from":19,"to":22,"score":5.5},\
            {"from":15,"to":18,"score":5},{"from":13,"to":14,"score":4.5},{"from":10,"to":12,"score":4},{"from":8,"to":9,"score":3.5},\
            {"from":6,"to":7,"score":3},{"from":4,"to":5,"score":2.5},{"from":2,"to":3,"score":2},{"from":0,"to":1,"score":1}]
            """;

    private static final Set<String> EXAM_TYPES = Set.of("CUSTOM", "IELTS", "TOEFL", "TOEIC");

    private static final int MAX_SCALES = 30;
    private static final int MAX_BYTES = 200_000;

    private final TeacherScoreScalesRepository repository;
    private final ObjectMapper mapper;
    private final JsonNode builtin;

    public ScoreScaleService(TeacherScoreScalesRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
        this.builtin = build(mapper);
    }

    @Transactional(readOnly = true)
    public JsonNode list(UUID ownerId) {
        return repository.findById(ownerId)
                .map(row -> withTypes(withoutLinear(row.getScales())))
                .orElseGet(() -> builtin.deepCopy());
    }

    private static JsonNode withTypes(JsonNode scales) {
        JsonNode copy = scales.deepCopy();
        for (JsonNode scale : copy) {
            if (scale instanceof ObjectNode object && !EXAM_TYPES.contains(scale.path("examType").asText(""))) {
                object.put("examType", builtinExamType(scale.path("id").asText("")));
            }
            for (JsonNode section : scale.path("sections")) {
                if (section instanceof ObjectNode object && !section.path("sectionType").isTextual()) {
                    object.put("sectionType", ScaleEvaluator.sectionType(section));
                }
            }
        }
        return copy;
    }

    private static String builtinExamType(String id) {
        String type = id.toUpperCase(Locale.ROOT);
        return !"CUSTOM".equals(type) && EXAM_TYPES.contains(type) ? type : "CUSTOM";
    }

    private JsonNode withoutLinear(JsonNode scales) {
        if (!scales.isArray()) {
            return scales;
        }
        ArrayNode result = mapper.createArrayNode();
        for (JsonNode scale : scales) {
            JsonNode starter = starter(scale.path("id").asText(""));
            boolean linear = false;
            for (JsonNode section : scale.path("sections")) {
                String method = section.path("convert").path("method").asText("linear");
                linear |= !"table".equals(method) && !"manual".equals(method);
            }
            if (!linear) {
                result.add(starter == null ? scale : withStarterMax(scale, starter));
            } else if (starter != null) {
                result.add(starter.deepCopy());
            } else {
                ObjectNode copy = scale.deepCopy();
                for (JsonNode node : copy.path("sections")) {
                    ObjectNode section = (ObjectNode) node;
                    String method = section.path("convert").path("method").asText("linear");
                    if (!"table".equals(method) && !"manual".equals(method)) {
                        section.set("convert", tableConvert(mapper, 40, linearTable(mapper, 40,
                                section.path("min").asDouble(0), section.path("max").asDouble(0), section.path("step").asDouble(1))));
                    }
                }
                result.add(copy);
            }
        }
        return result;
    }

    private JsonNode withStarterMax(JsonNode scale, JsonNode starter) {
        ObjectNode copy = scale.deepCopy();
        for (JsonNode node : copy.path("levels")) {
            if (node.path("max").isNumber()) {
                continue;
            }
            for (JsonNode original : starter.path("levels")) {
                if (original.path("label").asText().equals(node.path("label").asText())
                        && Math.abs(original.path("min").asDouble() - node.path("min").asDouble()) < 1e-9) {
                    ((ObjectNode) node).put("max", original.path("max").asDouble());
                }
            }
        }
        return copy;
    }

    @Transactional(readOnly = true)
    public JsonNode ownerCopy(UUID ownerId, String id) {
        for (JsonNode scale : list(ownerId)) {
            if (id.equals(scale.path("id").asText(""))) {
                return scale.deepCopy();
            }
        }
        return starterCopy(id);
    }

    public JsonNode starterCopy(String id) {
        JsonNode starter = starter(id);
        return starter == null ? null : starter.deepCopy();
    }

    private JsonNode starter(String id) {
        for (JsonNode scale : builtin) {
            if (scale.path("id").asText("").equals(id)) {
                return scale;
            }
        }
        return null;
    }

    @Transactional
    public JsonNode replace(UUID ownerId, JsonNode scales) {
        if (scales == null || !scales.isArray()) {
            throw invalid("Ожидается список шкал");
        }
        if (scales.size() > MAX_SCALES) {
            throw invalid("Не больше " + MAX_SCALES + " шкал");
        }
        for (JsonNode scale : scales) {
            if (!scale.isObject() || scale.path("title").asText("").isBlank()) {
                throw invalid("У каждой шкалы должно быть название");
            }
            JsonNode examType = scale.path("examType");
            if (!examType.isMissingNode() && !examType.isNull() && !EXAM_TYPES.contains(examType.asText(""))) {
                throw invalid("Неизвестный тип теста у шкалы «" + scale.path("title").asText() + "»");
            }
        }
        if (scales.toString().length() > MAX_BYTES) {
            throw invalid("Слишком большой объём настроек");
        }
        for (JsonNode starter : builtin) {
            String id = starter.path("id").asText();
            boolean kept = false;
            for (JsonNode scale : scales) {
                kept |= id.equals(scale.path("id").asText(""));
            }
            if (!kept) {
                throw invalid("Встроенный тест «" + starter.path("title").asText() + "» нельзя удалить");
            }
        }
        TeacherScoreScales row = repository.findById(ownerId).orElseGet(() -> {
            TeacherScoreScales created = new TeacherScoreScales();
            created.setOwnerId(ownerId);
            return created;
        });
        row.setScales(scales);
        row.setUpdatedAt(OffsetDateTime.now());
        return repository.save(row).getScales();
    }

    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", message);
    }

    private static JsonNode build(ObjectMapper mapper) {
        try {
            ArrayNode list = mapper.createArrayNode();
            list.add(ielts(mapper));
            list.add(toefl(mapper));
            list.add(toeic(mapper));
            return list;
        } catch (JsonProcessingException broken) {
            throw new IllegalStateException(broken);
        }
    }

    private static ObjectNode ielts(ObjectMapper mapper) throws JsonProcessingException {
        ArrayNode sections = mapper.createArrayNode();
        sections.add(section(mapper, "Listening", 1, 9, 0.5, tableConvert(mapper, 40, (ArrayNode) mapper.readTree(IELTS_LISTENING))));
        sections.add(section(mapper, "Reading", 1, 9, 0.5, tableConvert(mapper, 40, (ArrayNode) mapper.readTree(IELTS_READING))));
        sections.add(section(mapper, "Writing", 1, 9, 0.5, manual(mapper)));
        sections.add(section(mapper, "Speaking", 1, 9, 0.5, manual(mapper)));
        return exam(mapper, "ielts", "IELTS", sections, "average", 0.5, levels(mapper,
                "A1", 1, 2.5, "A2", 3, 3.5, "B1", 4, 5, "B2", 5.5, 6.5, "C1", 7, 8, "C2", 8.5, 9));
    }

    private static ObjectNode toefl(ObjectMapper mapper) {
        ArrayNode table = identityTable(mapper, 30);
        ArrayNode sections = mapper.createArrayNode();
        sections.add(section(mapper, "Reading", 0, 30, 1, tableConvert(mapper, 30, table)));
        sections.add(section(mapper, "Listening", 0, 30, 1, tableConvert(mapper, 30, table.deepCopy())));
        sections.add(section(mapper, "Speaking", 0, 30, 1, manual(mapper)));
        sections.add(section(mapper, "Writing", 0, 30, 1, manual(mapper)));
        return exam(mapper, "toefl", "TOEFL iBT", sections, "sum", null, levels(mapper,
                "A2", 0, 41, "B1", 42, 64, "B2", 65, 94, "C1", 95, 114, "C2", 115, 120));
    }

    private static ObjectNode toeic(ObjectMapper mapper) {
        ArrayNode table = linearTable(mapper, 100, 5, 495, 5);
        ArrayNode sections = mapper.createArrayNode();
        sections.add(section(mapper, "Listening", 5, 495, 5, tableConvert(mapper, 100, table)));
        sections.add(section(mapper, "Reading", 5, 495, 5, tableConvert(mapper, 100, table.deepCopy())));
        return exam(mapper, "toeic", "TOEIC", sections, "sum", null, levels(mapper,
                "A1", 10, 220, "A2", 225, 545, "B1", 550, 725, "B2", 730, 865, "C1", 870, 940, "C2", 945, 990));
    }

    private static ObjectNode exam(
            ObjectMapper mapper, String id, String title, ArrayNode sections, String aggregate, Double roundStep, ArrayNode levels
    ) {
        ObjectNode exam = mapper.createObjectNode();
        exam.put("id", id);
        exam.put("title", title);
        exam.put("examType", builtinExamType(id));
        exam.set("sections", sections);
        exam.put("aggregate", aggregate);
        ObjectNode round = mapper.createObjectNode();
        if (roundStep == null) {
            round.putNull("step");
        } else {
            round.put("step", roundStep);
        }
        round.put("mode", "nearest");
        exam.set("round", round);
        exam.set("levels", levels);
        return exam;
    }

    private static ObjectNode section(ObjectMapper mapper, String name, double min, double max, double step, ObjectNode convert) {
        ObjectNode section = mapper.createObjectNode();
        section.put("name", name);
        section.put("sectionType", name.toUpperCase(java.util.Locale.ROOT));
        section.put("min", min);
        section.put("max", max);
        section.put("step", step);
        section.set("convert", convert);
        return section;
    }

    private static ObjectNode tableConvert(ObjectMapper mapper, int rawMax, ArrayNode table) {
        ObjectNode convert = mapper.createObjectNode();
        convert.put("method", "table");
        convert.put("rawMax", rawMax);
        convert.set("table", table);
        return convert;
    }

    private static ObjectNode manual(ObjectMapper mapper) {
        ObjectNode convert = mapper.createObjectNode();
        convert.put("method", "manual");
        return convert;
    }

    private static ArrayNode levels(ObjectMapper mapper, Object... parts) {
        ArrayNode levels = mapper.createArrayNode();
        for (int i = 0; i < parts.length; i += 3) {
            ObjectNode level = mapper.createObjectNode();
            level.put("label", (String) parts[i]);
            level.put("min", ((Number) parts[i + 1]).doubleValue());
            level.put("max", ((Number) parts[i + 2]).doubleValue());
            levels.add(level);
        }
        return levels;
    }

    private static ArrayNode identityTable(ObjectMapper mapper, int max) {
        ArrayNode table = mapper.createArrayNode();
        for (int raw = 0; raw <= max; raw++) {
            table.add(row(mapper, raw, raw, raw));
        }
        return table;
    }

    private static ArrayNode linearTable(ObjectMapper mapper, int rawMax, double min, double max, double step) {
        ArrayNode table = mapper.createArrayNode();
        int from = 0;
        double prev = ScaleEvaluator.roundTo(min, step, "nearest");
        for (int raw = 1; raw <= rawMax; raw++) {
            double score = ScaleEvaluator.roundTo(min + (raw / (double) rawMax) * (max - min), step, "nearest");
            if (Double.compare(score, prev) != 0) {
                table.add(row(mapper, from, raw - 1, prev));
                from = raw;
                prev = score;
            }
        }
        table.add(row(mapper, from, rawMax, prev));
        return table;
    }

    private static ObjectNode row(ObjectMapper mapper, int from, int to, double score) {
        ObjectNode row = mapper.createObjectNode();
        row.put("from", from);
        row.put("to", to);
        row.put("score", score);
        return row;
    }
}
