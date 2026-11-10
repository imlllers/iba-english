package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionRepository;
import com.iba.testing.question.QuestionType;
import com.iba.testing.question.QuestionWriteRequest;
import com.iba.testing.question.engine.ContentCheck;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.question.engine.QuestionDraft;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.test.ExamAccess;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class ContentService {

    private final ExamAccess access;
    private final ExamTestService tests;
    private final TestSectionRepository sections;
    private final SectionPartRepository parts;
    private final MaterialBlockRepository blocks;
    private final QuestionRepository questions;
    private final QuestionEngines engines;

    public ContentService(ExamAccess access, ExamTestService tests, TestSectionRepository sections,
                          SectionPartRepository parts, MaterialBlockRepository blocks,
                          QuestionRepository questions, QuestionEngines engines) {
        this.access = access;
        this.tests = tests;
        this.sections = sections;
        this.parts = parts;
        this.blocks = blocks;
        this.questions = questions;
        this.engines = engines;
    }

    @Transactional
    public ObjectNode addSection(UUID ownerId, UUID testId, SectionWriteRequest request) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = new TestSection();
        section.setId(UUID.randomUUID());
        section.setTest(test);
        apply(section, request);
        section.setOrderIndex((int) sections.countByTest(test));
        sections.save(section);
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode updateSection(UUID ownerId, UUID testId, UUID sectionId, SectionWriteRequest request) {
        ExamTest test = editable(ownerId, testId);
        apply(requireSection(test, sectionId), request);
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode deleteSection(UUID ownerId, UUID testId, UUID sectionId) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        List<Question> sectionQuestions = questions.findBySectionOrderByOrderIndexAsc(section);
        for (Question question : sectionQuestions) {
            question.setPart(null);
            question.setMaterialBlock(null);
        }
        questions.flush();
        questions.deleteAll(sectionQuestions);
        blocks.deleteAll(blocks.findBySectionOrderByOrderIndexAsc(section));
        parts.deleteAll(parts.findBySectionOrderByOrderIndexAsc(section));
        sections.delete(section);
        sections.flush();
        int index = 0;
        for (TestSection item : sections.findByTestOrderByOrderIndexAsc(test)) {
            item.setOrderIndex(index++);
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode addPart(UUID ownerId, UUID testId, UUID sectionId) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        List<SectionPart> current = parts.findBySectionOrderByOrderIndexAsc(section);
        if (current.isEmpty()) {
            SectionPart first = newPart(section, 0, "Part 1");
            parts.saveAndFlush(first);
            for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
                question.setPart(first);
            }
            touch(test);
            return tests.detail(test);
        }
        SectionPart created = newPart(section, current.size(), "Part " + (current.size() + 1));
        parts.saveAndFlush(created);
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode updatePart(UUID ownerId, UUID testId, UUID sectionId, UUID partId, PartWriteRequest request) {
        ExamTest test = editable(ownerId, testId);
        SectionPart part = requirePart(test, sectionId, partId);
        part.setTitle(request.title().trim());
        part.setInstructions(request.instructions() == null ? "" : request.instructions().trim());
        if (request.timeLimitMinutes() != null) {
            if (request.timeLimitMinutes() < 0 || request.timeLimitMinutes() > 600) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Лимит части – от 0 до 600 минут");
            }
            part.setTimeLimitMinutes(request.timeLimitMinutes() == 0 ? null : request.timeLimitMinutes());
        }
        part.setOneQuestionPerPage(request.oneQuestionPerPage());
        if (request.items() != null) {
            ContentCheck.draft().contentItems(request.items(), "items");
            part.setItems(request.items());
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode deletePart(UUID ownerId, UUID testId, UUID sectionId, UUID partId) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        SectionPart part = requirePart(test, sectionId, partId);
        List<SectionPart> current = parts.findBySectionOrderByOrderIndexAsc(section);
        List<Question> sectionQuestions = questions.findBySectionOrderByOrderIndexAsc(section);
        if (current.size() == 1) {
            for (Question question : sectionQuestions) {
                question.setPart(null);
            }
            questions.flush();
            for (MaterialBlock block : blocks.findBySectionOrderByOrderIndexAsc(section)) {
                if (block.getPart() != null && block.getPart().getId().equals(part.getId())) {
                    block.setPart(null);
                }
            }
            parts.delete(part);
            touch(test);
            return tests.detail(test);
        }
        for (Question question : sectionQuestions) {
            if (question.getPart() != null && question.getPart().getId().equals(part.getId())) {
                question.setMaterialBlock(null);
                questions.delete(question);
            }
        }
        questions.flush();
        for (MaterialBlock block : blocks.findBySectionOrderByOrderIndexAsc(section)) {
            if (block.getPart() != null && block.getPart().getId().equals(part.getId())) {
                blocks.delete(block);
            }
        }
        blocks.flush();
        parts.delete(part);
        parts.flush();
        int index = 0;
        for (SectionPart item : parts.findBySectionOrderByOrderIndexAsc(section)) {
            item.setOrderIndex(index++);
        }
        int order = 0;
        for (Question item : questions.findBySectionOrderByOrderIndexAsc(section)) {
            item.setOrderIndex(order++);
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode addMaterialBlock(UUID ownerId, UUID testId, UUID sectionId, UUID partId) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        SectionPart part = resolvePartForWrite(test, section, partId);
        MaterialBlock block = new MaterialBlock();
        block.setId(UUID.randomUUID());
        block.setSection(section);
        block.setPart(part);
        block.setTitle("");
        block.setInstructions("");
        block.setContent(ContentNodes.doc(ContentNodes.paragraph()));
        ObjectNode text = ContentNodes.object()
                .put("id", UUID.randomUUID().toString())
                .put("kind", "text");
        text.set("doc", block.getContent());
        block.setItems(ContentNodes.array().add(text));
        block.setOrderIndex((int) blocks.countBySection(section));
        blocks.saveAndFlush(block);
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode updateMaterialBlock(UUID ownerId, UUID testId, UUID sectionId, UUID blockId,
                                          MaterialBlockWriteRequest request) {
        ExamTest test = editable(ownerId, testId);
        MaterialBlock block = requireBlock(test, sectionId, blockId);
        if (request.title() != null) {
            block.setTitle(request.title().trim());
        }
        if (request.instructions() != null) {
            block.setInstructions(request.instructions().trim());
        }
        if (request.content() != null) {
            block.setContent(request.content());
        }
        if (request.items() != null) {
            ContentCheck.draft().contentItems(request.items(), "items");
            block.setItems(request.items());
            mirrorLegacy(block);
        }
        if (request.mediaId() != null) {
            String mediaId = request.mediaId().trim();
            if (mediaId.isEmpty()) {
                block.setMediaId(null);
                block.setMediaKind(null);
            } else {
                block.setMediaId(mediaId);
                block.setMediaKind(request.mediaKind() == null || request.mediaKind().isBlank() ? "image" : request.mediaKind().trim());
            }
        } else if (request.mediaKind() != null && request.mediaKind().isBlank()) {
            block.setMediaId(null);
            block.setMediaKind(null);
        }
        touch(test);
        return tests.detail(test);
    }

    private void mirrorLegacy(MaterialBlock block) {
        JsonNode doc = null;
        String mediaId = null;
        String mediaKind = null;
        for (JsonNode item : block.getItems()) {
            String kind = item.path("kind").asText();
            if (doc == null && "text".equals(kind) && item.path("doc").isObject()) {
                doc = item.path("doc");
            }
            if (mediaId == null && ("audio".equals(kind) || "image".equals(kind)) && !item.path("mediaId").asText("").isBlank()) {
                mediaId = item.path("mediaId").asText();
                mediaKind = kind;
            }
        }
        block.setContent(doc == null ? ContentNodes.doc(ContentNodes.paragraph()) : doc);
        block.setMediaId(mediaId);
        block.setMediaKind(mediaKind);
    }

    @Transactional
    public ObjectNode deleteMaterialBlock(UUID ownerId, UUID testId, UUID sectionId, UUID blockId) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        MaterialBlock block = requireBlock(test, sectionId, blockId);
        for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
            if (question.getMaterialBlock() != null && question.getMaterialBlock().getId().equals(block.getId())) {
                question.setMaterialBlock(null);
            }
        }
        questions.flush();
        blocks.delete(block);
        blocks.flush();
        int index = 0;
        for (MaterialBlock item : blocks.findBySectionOrderByOrderIndexAsc(section)) {
            item.setOrderIndex(index++);
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode reorderQuestions(UUID ownerId, UUID testId, UUID sectionId, List<UUID> ids) {
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        List<Question> current = questions.findBySectionOrderByOrderIndexAsc(section);
        requireSameIds(current.stream().map(Question::getId).toList(), ids, "Список заданий не совпадает");
        for (Question question : current) {
            question.setOrderIndex(ids.indexOf(question.getId()));
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode placeQuestion(UUID ownerId, UUID testId, UUID sectionId, UUID questionId,
                                    UUID materialBlockId, UUID beforeId, UUID afterId, UUID partId) {
        if (beforeId != null && afterId != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите либо beforeId, либо afterId");
        }
        if (Objects.equals(questionId, beforeId) || Objects.equals(questionId, afterId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Нельзя поставить задание относительно себя");
        }
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        Question question = requireQuestion(test, questionId);
        if (!question.getSection().getId().equals(sectionId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Задание из другой секции");
        }

        MaterialBlock block = materialBlockId == null ? null : requireBlock(test, sectionId, materialBlockId);
        SectionPart part;
        if (block != null) {
            part = block.getPart();
        } else if (beforeId != null || afterId != null) {
            UUID anchorId = beforeId != null ? beforeId : afterId;
            Question anchor = requireQuestionInSection(test, sectionId, anchorId);
            part = anchor.getPart();
        } else if (partId != null) {
            part = requirePart(test, sectionId, partId);
        } else {
            part = question.getPart();
        }

        List<SectionPart> sectionParts = parts.findBySectionOrderByOrderIndexAsc(section);
        if (!sectionParts.isEmpty() && part == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Выберите часть");
        }
        if (sectionParts.isEmpty() && part != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "В секции нет частей");
        }
        if (block != null && part != null) {
            if (block.getPart() == null || !block.getPart().getId().equals(part.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Блок материала относится к другой части");
            }
        } else if (block != null && block.getPart() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Блок материала относится к части");
        }

        question.setMaterialBlock(block);
        question.setPart(part);

        List<Question> ordered = new ArrayList<>(questions.findBySectionOrderByOrderIndexAsc(section));
        ordered.removeIf(item -> item.getId().equals(questionId));

        int insertAt;
        if (beforeId != null) {
            insertAt = indexOfQuestion(ordered, beforeId);
            if (insertAt < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ориентир beforeId не найден в секции");
            }
        } else if (afterId != null) {
            int anchor = indexOfQuestion(ordered, afterId);
            if (anchor < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ориентир afterId не найден в секции");
            }
            insertAt = anchor + 1;
        } else if (block != null) {
            insertAt = 0;
            boolean found = false;
            for (int index = 0; index < ordered.size(); index++) {
                MaterialBlock itemBlock = ordered.get(index).getMaterialBlock();
                if (itemBlock != null && itemBlock.getId().equals(block.getId())) {
                    insertAt = index + 1;
                    found = true;
                }
            }
            if (!found) {
                insertAt = endOfPart(ordered, part);
            }
        } else {
            insertAt = endOfPart(ordered, part);
        }

        ordered.add(insertAt, question);
        for (int index = 0; index < ordered.size(); index++) {
            ordered.get(index).setOrderIndex(index);
        }
        touch(test);
        return tests.detail(test);
    }

    private Question requireQuestionInSection(ExamTest test, UUID sectionId, UUID questionId) {
        Question question = requireQuestion(test, questionId);
        if (!question.getSection().getId().equals(sectionId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ориентир из другой секции");
        }
        return question;
    }

    private static int indexOfQuestion(List<Question> ordered, UUID id) {
        for (int index = 0; index < ordered.size(); index++) {
            if (ordered.get(index).getId().equals(id)) {
                return index;
            }
        }
        return -1;
    }

    private static int endOfPart(List<Question> ordered, SectionPart part) {
        if (part == null) {
            return ordered.size();
        }
        int insertAt = 0;
        boolean found = false;
        for (int index = 0; index < ordered.size(); index++) {
            SectionPart itemPart = ordered.get(index).getPart();
            if (itemPart != null && itemPart.getId().equals(part.getId())) {
                insertAt = index + 1;
                found = true;
            }
        }
        return found ? insertAt : ordered.size();
    }

    @Transactional
    public ObjectNode addQuestion(UUID ownerId, UUID testId, UUID sectionId, String typeName, int count,
                                  UUID partId, UUID materialBlockId, boolean demo) {
        if (count < 1 || count > 40) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "За один раз можно добавить от 1 до 40 заданий");
        }
        ExamTest test = editable(ownerId, testId);
        TestSection section = requireSection(test, sectionId);
        SectionPart part = resolvePartForWrite(test, section, partId);
        MaterialBlock block = null;
        if (materialBlockId != null) {
            block = requireBlock(test, sectionId, materialBlockId);
            if (part != null) {
                if (block.getPart() == null || !block.getPart().getId().equals(part.getId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Блок материала относится к другой части");
                }
            } else if (block.getPart() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Блок материала относится к части");
            }
        }
        QuestionType type = engines.parse(typeName);
        List<Question> existing = questions.findBySectionOrderByOrderIndexAsc(section);
        int order = existing.size();
        if (block != null) {
            UUID blockId = block.getId();
            int last = existing.stream()
                    .filter(item -> item.getMaterialBlock() != null && item.getMaterialBlock().getId().equals(blockId))
                    .mapToInt(Question::getOrderIndex)
                    .max()
                    .orElse(-1);
            if (last >= 0) {
                order = last + 1;
                for (Question item : existing) {
                    if (item.getOrderIndex() >= order) {
                        item.setOrderIndex(item.getOrderIndex() + count);
                    }
                }
                questions.flush();
            }
        }
        for (int index = 0; index < count; index++) {
            Question question = new Question();
            question.setId(UUID.randomUUID());
            question.setSection(section);
            question.setPart(part);
            question.setMaterialBlock(block);
            question.setOrderIndex(order + index);
            if (demo) {
                engines.applyDemoDefaults(question, type);
            } else {
                engines.applyDefaults(question, type);
            }
            questions.save(question);
        }
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode duplicateQuestion(UUID ownerId, UUID testId, UUID questionId) {
        ExamTest test = editable(ownerId, testId);
        Question source = requireQuestion(test, questionId);
        List<Question> siblings = questions.findBySectionOrderByOrderIndexAsc(source.getSection());
        for (Question sibling : siblings) {
            if (sibling.getOrderIndex() > source.getOrderIndex()) {
                sibling.setOrderIndex(sibling.getOrderIndex() + 1);
            }
        }
        Question copy = new Question();
        copy.setId(UUID.randomUUID());
        copy.setSection(source.getSection());
        copy.setPart(source.getPart());
        copy.setMaterialBlock(source.getMaterialBlock());
        copy.setType(source.getType());
        copy.setPromptContent(source.getPromptContent().deepCopy());
        copy.setOptions(source.getOptions().deepCopy());
        copy.setAnswerKey(source.getAnswerKey().deepCopy());
        copy.setScoringConfig(source.getScoringConfig().deepCopy());
        copy.setSettings(source.getSettings().deepCopy());
        copy.setRequired(source.isRequired());
        copy.setOrderIndex(source.getOrderIndex() + 1);
        questions.save(copy);
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode updateQuestion(UUID ownerId, UUID testId, UUID questionId, QuestionWriteRequest request) {
        ExamTest test = editable(ownerId, testId);
        Question question = requireQuestion(test, questionId);
        QuestionType type = engines.parse(request.type());
        engines.validate(new QuestionDraft(type, request.promptContent(), request.options(),
                request.answerKey(), request.scoringConfig(), request.settings()), ContentCheck.draft());
        question.setType(type);
        question.setPromptContent(request.promptContent());
        question.setOptions(request.options());
        question.setAnswerKey(request.answerKey());
        question.setScoringConfig(request.scoringConfig());
        question.setRequired(request.required());
        question.setSettings(request.settings());
        touch(test);
        return tests.detail(test);
    }

    @Transactional
    public ObjectNode deleteQuestion(UUID ownerId, UUID testId, UUID questionId) {
        ExamTest test = editable(ownerId, testId);
        Question question = requireQuestion(test, questionId);
        TestSection section = question.getSection();
        questions.delete(question);
        questions.flush();
        int index = 0;
        for (Question item : questions.findBySectionOrderByOrderIndexAsc(section)) {
            item.setOrderIndex(index++);
        }
        touch(test);
        return tests.detail(test);
    }

    private ExamTest editable(UUID ownerId, UUID testId) {
        return access.requireOwned(testId, ownerId);
    }

    private void apply(TestSection section, SectionWriteRequest request) {
        SectionType type;
        try {
            type = SectionType.valueOf(request.sectionType());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Неизвестный тип секции");
        }
        if (request.timeLimitMinutes() != null && (request.timeLimitMinutes() < 0 || request.timeLimitMinutes() > 600)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Время секции должно быть от 0 до 600 минут");
        }
        section.setTitle(request.title().trim());
        section.setInstructions(request.instructions() == null ? "" : request.instructions().trim());
        section.setSectionType(type);
        section.setTimeLimitMinutes(request.timeLimitMinutes() == null || request.timeLimitMinutes() == 0 ? null : request.timeLimitMinutes());
        section.setAllowBackToQuestions(request.allowBackToQuestions());
        section.setAllowBackToPart(request.allowBackToPart());
        if (request.items() != null) {
            ContentCheck.draft().contentItems(request.items(), "items");
            section.setItems(request.items());
        } else if (section.getItems() == null) {
            section.setItems(ContentNodes.array());
        }
    }

    private SectionPart newPart(TestSection section, int orderIndex, String title) {
        SectionPart part = new SectionPart();
        part.setId(UUID.randomUUID());
        part.setSection(section);
        part.setTitle(title);
        part.setInstructions("");
        part.setItems(ContentNodes.array());
        part.setOrderIndex(orderIndex);
        return part;
    }

    private void requireSameIds(List<UUID> current, List<UUID> requested, String message) {
        if (requested == null || current.size() != requested.size() || !current.containsAll(requested)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", message);
        }
    }

    private TestSection requireSection(ExamTest test, UUID sectionId) {
        return sections.findById(sectionId)
                .filter(section -> section.getTest().getId().equals(test.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Секция не найдена"));
    }

    private SectionPart requirePart(ExamTest test, UUID sectionId, UUID partId) {
        return parts.findById(partId)
                .filter(part -> part.getSection().getId().equals(sectionId))
                .filter(part -> part.getSection().getTest().getId().equals(test.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Часть не найдена"));
    }

    private SectionPart resolvePartForWrite(ExamTest test, TestSection section, UUID partId) {
        List<SectionPart> sectionParts = parts.findBySectionOrderByOrderIndexAsc(section);
        if (!sectionParts.isEmpty()) {
            if (partId == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Выберите часть");
            }
            return requirePart(test, section.getId(), partId);
        }
        if (partId != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "В секции нет частей");
        }
        return null;
    }

    private MaterialBlock requireBlock(ExamTest test, UUID sectionId, UUID blockId) {
        return blocks.findById(blockId)
                .filter(block -> block.getSection().getId().equals(sectionId))
                .filter(block -> block.getSection().getTest().getId().equals(test.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Блок материала не найден"));
    }

    private Question requireQuestion(ExamTest test, UUID questionId) {
        return questions.findById(questionId)
                .filter(question -> question.getSection().getTest().getId().equals(test.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Задание не найдено"));
    }

    private void touch(ExamTest test) {
        test.setUpdatedAt(OffsetDateTime.now());
    }
}
