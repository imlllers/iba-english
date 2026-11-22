package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.media.MediaAssetRepository;
import com.iba.testing.media.MediaService;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionRepository;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.section.MaterialBlock;
import com.iba.testing.section.MaterialBlockRepository;
import com.iba.testing.section.SectionPart;
import com.iba.testing.section.SectionPartRepository;
import com.iba.testing.section.TestSection;
import com.iba.testing.section.TestSectionRepository;
import com.iba.testing.user.UserAccount;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class TestCopyService {

    private final ExamTestRepository tests;
    private final TestSectionRepository sections;
    private final SectionPartRepository parts;
    private final MaterialBlockRepository blocks;
    private final QuestionRepository questions;
    private final MediaAssetRepository mediaAssets;
    private final MediaService media;
    private final ObjectMapper mapper;

    public TestCopyService(ExamTestRepository tests, TestSectionRepository sections, SectionPartRepository parts,
                           MaterialBlockRepository blocks, QuestionRepository questions, MediaAssetRepository mediaAssets,
                           MediaService media, ObjectMapper mapper) {
        this.tests = tests;
        this.sections = sections;
        this.parts = parts;
        this.blocks = blocks;
        this.questions = questions;
        this.mediaAssets = mediaAssets;
        this.media = media;
        this.mapper = mapper;
    }

    @Transactional
    public ExamTest copy(ExamTest source, UserAccount owner, CopyOptions options) {
        OffsetDateTime now = OffsetDateTime.now();
        Set<UUID> sourceMediaIds = options.cloneMedia() ? collectMediaIds(source) : Set.of();
        Map<UUID, UUID> mediaMap = options.cloneMedia()
                ? buildMediaMap(source, owner)
                : Map.of();
        Set<UUID> clearSourceIds = options.cloneMedia()
                ? sourceMediaIds.stream().filter(id -> !mediaMap.containsKey(id)).collect(HashSet::new, Set::add, Set::addAll)
                : Set.of();
        ExamTest copy = new ExamTest();
        copy.setId(UUID.randomUUID());
        copy.setOwner(owner);
        String title = source.getTitle() + options.titleSuffix();
        copy.setTitle(title.length() > 200 ? title.substring(0, 200) : title);
        copy.setDescription(source.getDescription());
        copy.setExamPreset(source.getExamPreset());
        copy.setStatus(TestStatus.DRAFT);
        copy.setSettings(remapJson(source.getSettings().deepCopy(), mediaMap, clearSourceIds));
        copy.setListed(options.listed());
        copy.setSharedFromName(options.sharedFromName());
        copy.setCreatedAt(now);
        copy.setUpdatedAt(now);
        tests.save(copy);
        Map<UUID, UUID> sectionIds = new HashMap<>();
        Map<UUID, UUID> partIds = new HashMap<>();
        Map<UUID, UUID> blockIds = new HashMap<>();
        for (TestSection section : sections.findByTestOrderByOrderIndexAsc(source)) {
            TestSection sectionCopy = new TestSection();
            sectionCopy.setId(UUID.randomUUID());
            sectionCopy.setTest(copy);
            sectionCopy.setTitle(section.getTitle());
            sectionCopy.setInstructions(section.getInstructions());
            sectionCopy.setItems(remapJson(section.getItems() == null ? ContentNodes.array() : section.getItems().deepCopy(), mediaMap, clearSourceIds));
            sectionCopy.setOrderIndex(section.getOrderIndex());
            sectionCopy.setSectionType(section.getSectionType());
            sectionCopy.setTimeLimitMinutes(section.getTimeLimitMinutes());
            sectionCopy.setTimeLimitSeconds(section.getTimeLimitSeconds());
            sectionCopy.setAllowBackToQuestions(section.getAllowBackToQuestions());
            sectionCopy.setAllowBackToPart(section.getAllowBackToPart());
            sectionCopy.setSpeakingAutoFlow(section.getSpeakingAutoFlow());
            sections.save(sectionCopy);
            sectionIds.put(section.getId(), sectionCopy.getId());
            Map<UUID, SectionPart> partMap = new HashMap<>();
            for (SectionPart part : parts.findBySectionOrderByOrderIndexAsc(section)) {
                SectionPart partCopy = new SectionPart();
                partCopy.setId(UUID.randomUUID());
                partCopy.setSection(sectionCopy);
                partCopy.setTitle(part.getTitle());
                partCopy.setInstructions(part.getInstructions());
                partCopy.setItems(remapJson(part.getItems() == null ? ContentNodes.array() : part.getItems().deepCopy(), mediaMap, clearSourceIds));
                partCopy.setTimeLimitMinutes(part.getTimeLimitMinutes());
                partCopy.setTimeLimitSeconds(part.getTimeLimitSeconds());
                partCopy.setOneQuestionPerPage(part.getOneQuestionPerPage());
                partCopy.setAutoAdvanceOnTimeout(part.getAutoAdvanceOnTimeout());
                partCopy.setOrderIndex(part.getOrderIndex());
                parts.save(partCopy);
                partIds.put(part.getId(), partCopy.getId());
                partMap.put(part.getId(), partCopy);
            }
            for (MaterialBlock block : blocks.findBySectionOrderByOrderIndexAsc(section)) {
                MaterialBlock blockCopy = new MaterialBlock();
                blockCopy.setId(UUID.randomUUID());
                blockCopy.setSection(sectionCopy);
                if (block.getPart() != null) {
                    blockCopy.setPart(partMap.get(block.getPart().getId()));
                }
                blockCopy.setTitle(block.getTitle());
                blockCopy.setInstructions(block.getInstructions());
                blockCopy.setContent(remapJson(block.getContent(), mediaMap, clearSourceIds));
                blockCopy.setItems(remapJson(block.getItems(), mediaMap, clearSourceIds));
                blockCopy.setMediaId(remapMediaIdString(block.getMediaId(), mediaMap, clearSourceIds));
                blockCopy.setMediaKind(block.getMediaKind());
                blockCopy.setOrderIndex(block.getOrderIndex());
                blocks.save(blockCopy);
                blockIds.put(block.getId(), blockCopy.getId());
            }
            for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
                Question questionCopy = new Question();
                questionCopy.setId(UUID.randomUUID());
                questionCopy.setSection(sectionCopy);
                if (question.getPart() != null) {
                    questionCopy.setPart(partMap.get(question.getPart().getId()));
                }
                if (question.getMaterialBlock() != null) {
                    UUID nextBlock = blockIds.get(question.getMaterialBlock().getId());
                    questionCopy.setMaterialBlock(nextBlock == null ? null : blocks.findById(nextBlock).orElse(null));
                }
                questionCopy.setType(question.getType());
                questionCopy.setPromptContent(remapJson(question.getPromptContent().deepCopy(), mediaMap, clearSourceIds));
                questionCopy.setOptions(remapJson(question.getOptions().deepCopy(), mediaMap, clearSourceIds));
                questionCopy.setAnswerKey(remapJson(question.getAnswerKey().deepCopy(), mediaMap, clearSourceIds));
                questionCopy.setScoringConfig(remapJson(question.getScoringConfig().deepCopy(), mediaMap, clearSourceIds));
                questionCopy.setOrderIndex(question.getOrderIndex());
                questionCopy.setRequired(question.isRequired());
                questionCopy.setSettings(remapJson(question.getSettings().deepCopy(), mediaMap, clearSourceIds));
                questions.save(questionCopy);
            }
        }
        remapScoreScaleSections(copy, sectionIds);
        return copy;
    }

    public void remapScoreScaleSections(ExamTest test, Map<UUID, UUID> sectionIds) {
        JsonNode mapping = test.getSettings().path("scoreScale").path("sections");
        if (!mapping.isArray()) {
            return;
        }
        for (JsonNode item : mapping) {
            if (!(item instanceof ObjectNode entry) || !entry.path("sectionId").isTextual()) {
                continue;
            }
            try {
                UUID next = sectionIds.get(UUID.fromString(entry.path("sectionId").asText()));
                if (next != null) {
                    entry.put("sectionId", next.toString());
                } else {
                    entry.remove("sectionId");
                }
            } catch (IllegalArgumentException ignored) {
                entry.remove("sectionId");
            }
        }
        tests.save(test);
    }

    @Transactional
    public void transferMediaOwner(Set<UUID> mediaIds, UserAccount from, UserAccount to) {
        for (UUID id : mediaIds) {
            mediaAssets.findById(id).ifPresent(asset -> {
                if (asset.getOwner() != null && asset.getOwner().getId().equals(from.getId())) {
                    asset.setOwner(to);
                    mediaAssets.save(asset);
                }
            });
        }
    }

    @Transactional
    public void deleteClonedMedia(Set<UUID> mediaIds) {
        for (UUID id : mediaIds) {
            mediaAssets.findById(id).ifPresent(asset -> {
                if (!asset.isInLibrary() && asset.getAttempt() == null) {
                    media.deleteAssetBytes(asset);
                    mediaAssets.delete(asset);
                }
            });
        }
    }

    public Set<UUID> collectMediaIds(ExamTest test) {
        Set<UUID> ids = new HashSet<>();
        for (TestSection section : sections.findByTestOrderByOrderIndexAsc(test)) {
            collectFromJson(section.getItems(), ids);
            for (SectionPart part : parts.findBySectionOrderByOrderIndexAsc(section)) {
                collectFromJson(part.getItems(), ids);
            }
            for (MaterialBlock block : blocks.findBySectionOrderByOrderIndexAsc(section)) {
                collectFromJson(block.getContent(), ids);
                collectFromJson(block.getItems(), ids);
                addMediaUuid(block.getMediaId(), ids);
            }
            for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
                collectFromJson(question.getPromptContent(), ids);
                collectFromJson(question.getOptions(), ids);
                collectFromJson(question.getSettings(), ids);
            }
        }
        collectFromJson(test.getSettings(), ids);
        return ids;
    }

    private Map<UUID, UUID> buildMediaMap(ExamTest source, UserAccount owner) {
        Map<UUID, UUID> map = new HashMap<>();
        for (UUID id : collectMediaIds(source)) {
            mediaAssets.findById(id).ifPresent(asset -> {
                media.cloneForOwner(asset, owner).ifPresent(clone -> map.put(id, clone.getId()));
            });
        }
        return map;
    }

    private JsonNode remapJson(JsonNode node, Map<UUID, UUID> mediaMap, Set<UUID> clearSourceIds) {
        if (node == null) {
            return null;
        }
        if (mediaMap.isEmpty() && clearSourceIds.isEmpty()) {
            return node;
        }
        return remapJsonTree(node.deepCopy(), mediaMap, clearSourceIds);
    }

    private JsonNode remapJsonTree(JsonNode node, Map<UUID, UUID> mediaMap, Set<UUID> clearSourceIds) {
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node;
            if (obj.has("mediaId")) {
                JsonNode raw = obj.get("mediaId");
                if (raw.isNull()) {
                    obj.putNull("mediaId");
                } else if (raw.isTextual()) {
                    UUID id = tryParseUuid(raw.asText());
                    if (id != null) {
                        UUID next = mediaMap.get(id);
                        if (next != null) {
                            obj.put("mediaId", next.toString());
                        } else if (clearSourceIds.contains(id)) {
                            obj.putNull("mediaId");
                        }
                    }
                }
            }
            obj.fields().forEachRemaining(field -> {
                if (!"mediaId".equals(field.getKey())) {
                    obj.set(field.getKey(), remapJsonTree(field.getValue(), mediaMap, clearSourceIds));
                }
            });
            return obj;
        }
        if (node.isArray()) {
            ArrayNode array = (ArrayNode) node;
            for (int index = 0; index < array.size(); index++) {
                array.set(index, remapJsonTree(array.get(index), mediaMap, clearSourceIds));
            }
            return array;
        }
        return node;
    }

    private String remapMediaIdString(String value, Map<UUID, UUID> mediaMap, Set<UUID> clearSourceIds) {
        if (value == null || value.isBlank()) {
            return value;
        }
        if (mediaMap.isEmpty() && clearSourceIds.isEmpty()) {
            return value;
        }
        try {
            UUID id = UUID.fromString(value);
            UUID next = mediaMap.get(id);
            if (next != null) {
                return next.toString();
            }
            if (clearSourceIds.contains(id)) {
                return null;
            }
            return value;
        } catch (IllegalArgumentException exception) {
            return value;
        }
    }

    private UUID tryParseUuid(String value) {
        if (value == null || value.length() != 36) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private void collectFromJson(JsonNode node, Set<UUID> ids) {
        if (node == null) {
            return;
        }
        if (node.isTextual()) {
            addMediaUuid(node.asText(), ids);
            return;
        }
        if (node.isObject()) {
            node.fields().forEachRemaining(field -> {
                if (field.getKey().equals("mediaId") && field.getValue().isTextual()) {
                    addMediaUuid(field.getValue().asText(), ids);
                }
                collectFromJson(field.getValue(), ids);
            });
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                collectFromJson(child, ids);
            }
        }
    }

    private void addMediaUuid(String value, Set<UUID> ids) {
        UUID id = tryParseUuid(value);
        if (id != null) {
            ids.add(id);
        }
    }

    public record CopyOptions(String titleSuffix, boolean listed, boolean cloneMedia, String sharedFromName) {
        public static CopyOptions selfDuplicate() {
            return new CopyOptions(" (копия)", true, false, null);
        }

        public static CopyOptions shareSnapshot() {
            return new CopyOptions("", false, true, null);
        }
    }
}