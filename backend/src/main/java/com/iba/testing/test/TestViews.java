package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionRepository;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.section.MaterialBlock;
import com.iba.testing.section.MaterialBlockRepository;
import com.iba.testing.section.SectionPart;
import com.iba.testing.section.SectionPartRepository;
import com.iba.testing.section.TestSection;
import com.iba.testing.section.TestSectionRepository;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class TestViews {

    private final TestSectionRepository sections;
    private final SectionPartRepository parts;
    private final MaterialBlockRepository blocks;
    private final QuestionRepository questions;
    private final QuestionEngines engines;
    private final ObjectMapper mapper;

    public TestViews(TestSectionRepository sections, SectionPartRepository parts, MaterialBlockRepository blocks,
                     QuestionRepository questions, QuestionEngines engines, ObjectMapper mapper) {
        this.sections = sections;
        this.parts = parts;
        this.blocks = blocks;
        this.questions = questions;
        this.engines = engines;
        this.mapper = mapper;
    }

    public ObjectNode detail(ExamTest test, TestVersion latest) {
        ObjectNode node = meta(test, latest == null ? null : latest.getPublishedAt());
        node.put("publishedVersion", latest == null ? 0 : latest.getVersionNumber());
        node.put("hasUnpublishedChanges", latest == null || test.getUpdatedAt().isAfter(latest.getPublishedAt()));
        node.set("sections", sectionArray(test, true));
        return node;
    }

    public ObjectNode snapshot(ExamTest test) {
        ObjectNode node = mapper.createObjectNode();
        node.put("title", test.getTitle());
        node.put("description", test.getDescription());
        node.put("examPreset", test.getExamPreset());
        node.set("sections", sectionArray(test, true));
        return node;
    }

    public ObjectNode publicView(JsonNode snapshot, JsonNode settings) {
        ObjectNode node = mapper.createObjectNode();
        node.put("title", snapshot.path("title").asText(""));
        node.put("description", snapshot.path("description").asText(""));
        node.set("settings", publicSettings(settings));
        boolean shuffleChoices = settings.path("shuffleChoices").asBoolean(false);
        ArrayNode sectionsNode = node.putArray("sections");
        for (JsonNode section : snapshot.path("sections")) {
            ObjectNode copy = ((ObjectNode) section).deepCopy();
            ArrayNode questionsNode = mapper.createArrayNode();
            int listeningSeconds = ListeningTiming.seconds(settings, section.path("sectionType").asText(""));
            for (JsonNode question : copy.path("questions")) {
                ObjectNode publicQuestion = engines.publicQuestion(question);
                if (listeningSeconds > 0 && publicQuestion.get("settings") instanceof ObjectNode questionSettings) {
                    questionSettings.put("timeLimitSeconds", listeningSeconds);
                }
                if (shuffleChoices) {
                    shuffleChoiceOptions(publicQuestion);
                }
                questionsNode.add(publicQuestion);
            }
            copy.set("questions", questionsNode);
            sectionsNode.add(copy);
        }
        return node;
    }

    private void shuffleChoiceOptions(ObjectNode question) {
        String type = question.path("type").asText("");
        if (!type.equals("SINGLE_CHOICE") && !type.equals("MULTIPLE_SELECT")) {
            return;
        }
        JsonNode options = question.get("options");
        if (options != null && options.isArray()) {
            question.set("options", ContentNodes.shuffled(options, question.path("id").asText()));
        }
    }

    public int questionCount(ExamTest test) {
        return (int) questions.countByTestId(test.getId());
    }

    private ObjectNode meta(ExamTest test, OffsetDateTime publishedAt) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", test.getId().toString());
        node.put("title", test.getTitle());
        node.put("description", test.getDescription());
        if (test.getExamPreset() != null) {
            node.put("examPreset", test.getExamPreset());
        } else {
            node.putNull("examPreset");
        }
        node.put("status", test.getStatus().name());
        if (test.getPublicToken() != null) {
            node.put("publicToken", test.getPublicToken());
        } else {
            node.putNull("publicToken");
        }
        if (test.getPublicTokenExpiresAt() != null) {
            node.put("publicTokenExpiresAt", test.getPublicTokenExpiresAt().toString());
        } else {
            node.putNull("publicTokenExpiresAt");
        }
        node.set("settings", test.getSettings());
        node.put("updatedAt", test.getUpdatedAt().toString());
        if (publishedAt != null) {
            node.put("publishedAt", publishedAt.toString());
        } else {
            node.putNull("publishedAt");
        }
        node.put("questionCount", questionCount(test));
        return node;
    }

    private ArrayNode sectionArray(ExamTest test, boolean includeAnswers) {
        ArrayNode array = mapper.createArrayNode();
        List<TestSection> sectionList = sections.findByTestOrderByOrderIndexAsc(test);
        for (TestSection section : sectionList) {
            ObjectNode node = mapper.createObjectNode();
            node.put("id", section.getId().toString());
            node.put("title", section.getTitle());
            node.put("instructions", section.getInstructions());
            node.set("items", section.getItems() == null ? mapper.createArrayNode() : section.getItems());
            node.put("orderIndex", section.getOrderIndex());
            node.put("sectionType", section.getSectionType().name());
            if (section.getTimeLimitMinutes() == null) {
                node.putNull("timeLimitMinutes");
            } else {
                node.put("timeLimitMinutes", section.getTimeLimitMinutes());
            }
            putNullableBoolean(node, "allowBackToQuestions", section.getAllowBackToQuestions());
            putNullableBoolean(node, "allowBackToPart", section.getAllowBackToPart());
            ArrayNode partNodes = node.putArray("parts");
            for (SectionPart part : parts.findBySectionOrderByOrderIndexAsc(section)) {
                partNodes.add(partNode(part));
            }
            ArrayNode blockNodes = node.putArray("materialBlocks");
            for (MaterialBlock block : blocks.findBySectionOrderByOrderIndexAsc(section)) {
                blockNodes.add(blockNode(block));
            }
            ArrayNode questionNodes = node.putArray("questions");
            for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
                questionNodes.add(questionNode(question, includeAnswers));
            }
            array.add(node);
        }
        return array;
    }

    private ObjectNode partNode(SectionPart part) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", part.getId().toString());
        node.put("title", part.getTitle());
        node.put("instructions", part.getInstructions());
        node.set("items", part.getItems() == null ? mapper.createArrayNode() : part.getItems());
        if (part.getTimeLimitMinutes() == null) {
            node.putNull("timeLimitMinutes");
        } else {
            node.put("timeLimitMinutes", part.getTimeLimitMinutes());
        }
        putNullableBoolean(node, "oneQuestionPerPage", part.getOneQuestionPerPage());
        node.put("orderIndex", part.getOrderIndex());
        return node;
    }

    private static void putNullableBoolean(ObjectNode node, String field, Boolean value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private ObjectNode blockNode(MaterialBlock block) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", block.getId().toString());
        if (block.getPart() == null) {
            node.putNull("partId");
        } else {
            node.put("partId", block.getPart().getId().toString());
        }
        node.put("title", block.getTitle());
        node.put("instructions", block.getInstructions() == null ? "" : block.getInstructions());
        node.set("content", block.getContent());
        node.set("items", block.getItems());
        if (block.getMediaId() == null || block.getMediaId().isBlank()) {
            node.putNull("mediaId");
            node.putNull("mediaKind");
        } else {
            node.put("mediaId", block.getMediaId());
            node.put("mediaKind", block.getMediaKind() == null ? "image" : block.getMediaKind());
        }
        node.put("orderIndex", block.getOrderIndex());
        return node;
    }

    private ObjectNode questionNode(Question question, boolean includeAnswers) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", question.getId().toString());
        if (question.getPart() == null) {
            node.putNull("partId");
        } else {
            node.put("partId", question.getPart().getId().toString());
        }
        if (question.getMaterialBlock() == null) {
            node.putNull("materialBlockId");
        } else {
            node.put("materialBlockId", question.getMaterialBlock().getId().toString());
        }
        node.put("type", question.getType().name());
        node.set("promptContent", question.getPromptContent());
        node.set("options", question.getOptions());
        if (includeAnswers) {
            node.set("answerKey", question.getAnswerKey());
        }
        node.set("scoringConfig", question.getScoringConfig());
        node.put("orderIndex", question.getOrderIndex());
        node.put("required", question.isRequired());
        node.set("settings", question.getSettings());
        return node;
    }

    private ObjectNode publicSettings(JsonNode settings) {
        ObjectNode node = mapper.createObjectNode();
        node.put("requireParticipantName", true);
        node.put("requireParticipantEmail", settings.path("requireParticipantEmail").asBoolean(true));
        node.put("allowBackToQuestions", settings.path("allowBackToQuestions").asBoolean(true));
        node.put("allowBackToPart", settings.path("allowBackToPart").asBoolean(true));
        node.put("allowBackToSection", settings.path("allowBackToSection").asBoolean(true));
        node.put("shuffleChoices", settings.path("shuffleChoices").asBoolean(false));
        node.put("audioAutoStart", settings.path("audioAutoStart").asBoolean(false));
        String numberFormat = settings.path("questionNumberFormat").asText("1");
        if (!numberFormat.equals("1")
                && !numberFormat.equals("1.")
                && !numberFormat.equals("1)")
                && !numberFormat.equals("(1)")
                && !numberFormat.equals("Q1")
                && !numberFormat.equals("Question 1")) {
            numberFormat = "1";
        }
        node.put("questionNumberFormat", numberFormat);
        String numberScope = settings.path("questionNumberScope").asText("test");
        if (!numberScope.equals("test")
                && !numberScope.equals("section")
                && !numberScope.equals("part")) {
            numberScope = "test";
        }
        node.put("questionNumberScope", numberScope);
        String examType = settings.path("examType").asText("CUSTOM");
        if (!examType.equals("CUSTOM")
                && !examType.equals("IELTS")
                && !examType.equals("TOEFL")
                && !examType.equals("TOEIC")) {
            examType = "CUSTOM";
        }
        node.put("examType", examType);
        node.put("oneQuestionPerPage", settings.path("oneQuestionPerPage").asBoolean(true));
        String errorExplanationMode = settings.path("errorExplanationMode").asText("off");
        if (!errorExplanationMode.equals("off")
                && !errorExplanationMode.equals("during")
                && !errorExplanationMode.equals("after")
                && !errorExplanationMode.equals("both")) {
            errorExplanationMode = "off";
        }
        node.put("errorExplanationMode", errorExplanationMode);
        if (settings.path("focusLossMaxWarnings").isNumber() && settings.path("focusLossMaxWarnings").asInt() > 0) {
            node.put("focusLossMaxWarnings", settings.path("focusLossMaxWarnings").asInt());
        } else {
            node.putNull("focusLossMaxWarnings");
        }
        node.put("showResultToParticipant", settings.path("showResultToParticipant").asBoolean(true));
        node.put("resultDetail", settings.path("resultDetail").asText("score_only"));
        if (settings.path("maxAttempts").isNumber() && settings.path("maxAttempts").asInt() > 0) {
            node.put("maxAttempts", settings.path("maxAttempts").asInt());
        } else {
            node.putNull("maxAttempts");
        }
        if (settings.path("timeLimitMinutes").isNumber()) {
            node.put("timeLimitMinutes", settings.path("timeLimitMinutes").asInt());
        } else {
            node.putNull("timeLimitMinutes");
        }
        copyText(node, settings, "availableFrom");
        copyText(node, settings, "availableUntil");
        return node;
    }

    private void copyText(ObjectNode target, JsonNode source, String field) {
        if (source.path(field).isTextual()) {
            target.put(field, source.path(field).asText());
        } else {
            target.putNull(field);
        }
    }
}
