package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.audit.AuditService;
import com.iba.testing.common.Tokens;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.preset.PresetCatalog;
import com.iba.testing.scale.ScoreScaleService;
import com.iba.testing.question.Question;
import com.iba.testing.question.QuestionRepository;
import com.iba.testing.question.engine.ContentCheck;
import com.iba.testing.question.engine.ContentNodes;
import com.iba.testing.question.engine.QuestionEngines;
import com.iba.testing.section.SectionPart;
import com.iba.testing.section.SectionPartRepository;
import com.iba.testing.section.SectionType;
import com.iba.testing.section.TestSection;
import com.iba.testing.section.TestSectionRepository;
import com.iba.testing.template.ExamTemplate;
import com.iba.testing.template.ExamTemplateService;
import com.iba.testing.test.dto.CreateTestRequest;
import com.iba.testing.test.dto.UpdateTestRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ExamTestService {

    private final ExamTestRepository tests;
    private final TestSectionRepository sections;
    private final SectionPartRepository parts;
    private final QuestionRepository questions;
    private final TestVersionRepository versions;
    private final TestAttemptRepository attempts;
    private final ExamAccess access;
    private final TestViews views;
    private final PresetCatalog presets;
    private final ExamTemplateService examTemplates;
    private final ScoreScaleService scoreScales;
    private final QuestionEngines engines;
    private final AuditService audit;
    private final PlatformService platform;
    private final ObjectMapper mapper;
    private final TestCopyService copies;

    public ExamTestService(ExamTestRepository tests, TestSectionRepository sections, SectionPartRepository parts,
                           QuestionRepository questions, TestVersionRepository versions, TestAttemptRepository attempts,
                           ExamAccess access, TestViews views, PresetCatalog presets, ExamTemplateService examTemplates,
                           ScoreScaleService scoreScales, QuestionEngines engines, AuditService audit, PlatformService platform,
                           ObjectMapper mapper, TestCopyService copies) {
        this.tests = tests;
        this.sections = sections;
        this.parts = parts;
        this.questions = questions;
        this.versions = versions;
        this.attempts = attempts;
        this.access = access;
        this.views = views;
        this.presets = presets;
        this.examTemplates = examTemplates;
        this.scoreScales = scoreScales;
        this.engines = engines;
        this.audit = audit;
        this.platform = platform;
        this.mapper = mapper;
        this.copies = copies;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> list(UUID ownerId, String query, String status, String examPreset, int page, int size) {
        var owner = access.requireUser(ownerId);
        String presetFilter = normalizePresetFilter(examPreset);
        String q = query == null ? "" : query.trim();
        return pageByAccess(status, page, size,
                (stored, pageable) -> tests.searchOwned(owner, stored, presetFilter, q, pageable), this::summary);
    }

    public String accessStatus(ExamTest test, TestVersion latest) {
        if (test.getStatus() != TestStatus.PUBLISHED || latest == null) {
            return "DRAFT";
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (test.getPublicToken() == null
                || (test.getPublicTokenExpiresAt() != null && !test.getPublicTokenExpiresAt().isAfter(now))) {
            return "CLOSED";
        }
        if (!AccessDates.ENABLED) {
            return "OPEN";
        }
        JsonNode settings = latest.getSettingsSnapshot() == null ? test.getSettings() : latest.getSettingsSnapshot();
        OffsetDateTime until = settingMoment(settings, "availableUntil");
        if (until != null && now.isAfter(until)) {
            return "CLOSED";
        }
        OffsetDateTime from = settingMoment(settings, "availableFrom");
        if (from != null && now.isBefore(from)) {
            return "SCHEDULED";
        }
        return "OPEN";
    }

    public PageResponse<ObjectNode> pageByAccess(String status, int page, int size,
                                                 java.util.function.BiFunction<TestStatus, PageRequest, org.springframework.data.domain.Page<ExamTest>> fetch,
                                                 java.util.function.Function<ExamTest, ObjectNode> view) {
        Sort sort = Sort.by(Sort.Direction.DESC, "updatedAt");
        String access = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("DRAFT", "SCHEDULED", "OPEN", "CLOSED").contains(access)) {
            var result = fetch.apply(null, PageRequest.of(page, size, sort));
            return new PageResponse<>(result.map(view).toList(), page, size, result.getTotalElements());
        }
        if (access.equals("DRAFT")) {
            var result = fetch.apply(TestStatus.DRAFT, PageRequest.of(page, size, sort));
            return new PageResponse<>(result.map(view).toList(), page, size, result.getTotalElements());
        }
        List<ObjectNode> matching = fetch.apply(TestStatus.PUBLISHED, PageRequest.of(0, 10_000, sort)).stream()
                .map(view)
                .filter(node -> access.equals(node.path("accessStatus").asText()))
                .toList();
        int from = Math.min(page * size, matching.size());
        int to = Math.min(from + size, matching.size());
        return new PageResponse<>(matching.subList(from, to), page, size, matching.size());
    }

    private static OffsetDateTime settingMoment(JsonNode settings, String field) {
        JsonNode value = settings == null ? null : settings.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value.asText());
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private static String normalizePresetFilter(String examPreset) {
        if (examPreset == null || examPreset.isBlank() || "__all__".equals(examPreset)) {
            return null;
        }
        if ("__none__".equals(examPreset)) {
            return "";
        }
        return examPreset.trim();
    }

    @Transactional
    public ObjectNode create(UUID ownerId, CreateTestRequest request) {
        var owner = access.requireUser(ownerId);
        OffsetDateTime now = OffsetDateTime.now();
        ExamTest test = new ExamTest();
        test.setId(UUID.randomUUID());
        test.setOwner(owner);
        test.setTitle(request.title().trim());
        test.setDescription(request.description() == null ? "" : request.description().trim());
        test.setStatus(TestStatus.DRAFT);
        test.setCreatedAt(now);
        test.setUpdatedAt(now);

        ExamTemplate template = null;
        PresetCatalog.ExamPreset preset = null;
        if (request.templateId() != null) {
            template = examTemplates.requireOwned(ownerId, request.templateId());
        } else if (request.examPreset() != null && !request.examPreset().isBlank()) {
            preset = presets.find(request.examPreset());
            if (preset == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_PRESET", "Неизвестный профиль экзамена");
            }
        }

        ObjectNode settingsSource = mapper.createObjectNode();
        if (template != null && template.getDefaultSettings() != null) {
            settingsSource = template.getDefaultSettings().deepCopy();
        } else if (preset != null && preset.defaultSettings() != null) {
            settingsSource = mapper.valueToTree(preset.defaultSettings());
        }
        test.setSettings(cleanSettings(settingsSource));
        if (template != null) {
            if (template.getBuiltinKey() != null) {
                test.setExamPreset(template.getBuiltinKey());
            } else {
                test.setExamPreset(presetFromFamilyOrType(template.getFamily(), test.getSettings()));
            }
        } else {
            test.setExamPreset(preset == null ? null : preset.id());
        }
        attachMissingScoreScale(test, ownerId);
        tests.save(test);

        if (template != null) {
            List<UUID> created = applyTemplateSections(test, template.getSections());
            bindScaleSections(test, created);
        } else if (preset != null) {
            int index = 0;
            for (var sectionPreset : preset.sections()) {
                TestSection section = new TestSection();
                section.setId(UUID.randomUUID());
                section.setTest(test);
                section.setTitle(sectionPreset.title());
                section.setInstructions(sectionPreset.instructions());
                section.setItems(ContentNodes.array());
                section.setOrderIndex(index++);
                section.setSectionType(SectionType.valueOf(sectionPreset.sectionType()));
                section.setTimeLimitMinutes(sectionPreset.timeLimitMinutes());
                section.setAllowBackToQuestions(sectionPreset.allowBackToQuestions());
                section.setAllowBackToPart(sectionPreset.allowBackToPart());
                section.setSpeakingAutoFlow(sectionPreset.speakingAutoFlow());
                sections.save(section);
                int partIndex = 0;
                for (var partPreset : sectionPreset.parts()) {
                    SectionPart part = new SectionPart();
                    part.setId(UUID.randomUUID());
                    part.setSection(section);
                    part.setTitle(partPreset.title());
                    part.setInstructions("");
                    part.setItems(ContentNodes.array());
                    part.setOrderIndex(partIndex++);
                    part.setOneQuestionPerPage(partPreset.oneQuestionPerPage());
                    part.setTimeLimitMinutes(partPreset.timeLimitMinutes());
                    part.setTimeLimitSeconds(partPreset.timeLimitSeconds());
                    part.setAutoAdvanceOnTimeout(partPreset.autoAdvanceOnTimeout());
                    parts.save(part);
                }
            }
            bindScaleSections(test, createdIdsFromPreset(test));
        } else {
            TestSection section = new TestSection();
            section.setId(UUID.randomUUID());
            section.setTest(test);
            section.setTitle("Section 1");
            section.setInstructions("");
            section.setItems(ContentNodes.array());
            section.setOrderIndex(0);
            section.setSectionType(SectionType.CUSTOM);
            sections.save(section);
        }
        return detail(test);
    }

    private static String presetFromFamilyOrType(String family, JsonNode settings) {
        if (family != null && (family.equals("IELTS") || family.equals("TOEFL") || family.equals("TOEIC"))) {
            return family;
        }
        String examType = settings.path("examType").asText("CUSTOM");
        if (examType.equals("IELTS") || examType.equals("TOEFL") || examType.equals("TOEIC")) {
            return examType;
        }
        return null;
    }

    private void attachMissingScoreScale(ExamTest test, UUID ownerId) {
        JsonNode current = test.getSettings().path("scoreScale");
        if (current.path("scale").isObject()) {
            return;
        }
        String examType = test.getSettings().path("examType").asText("CUSTOM");
        String scaleId = examType.toLowerCase(Locale.ROOT);
        JsonNode scale = scoreScales.ownerCopy(ownerId, scaleId);
        if (scale == null || !test.getSettings().isObject()) {
            return;
        }
        ObjectNode binding = ((ObjectNode) test.getSettings()).putObject("scoreScale");
        binding.put("sourceId", scale.path("id").asText());
        binding.set("scale", scale);
        binding.putArray("sections");
    }

    private List<UUID> createdIdsFromPreset(ExamTest test) {
        return sections.findByTestOrderByOrderIndexAsc(test).stream().map(TestSection::getId).toList();
    }

    private void bindScaleSections(ExamTest test, List<UUID> sectionIds) {
        JsonNode bindingNode = test.getSettings().path("scoreScale");
        if (!bindingNode.isObject()) {
            return;
        }
        ObjectNode binding = (ObjectNode) bindingNode;
        JsonNode scaleSections = binding.path("scale").path("sections");
        ArrayNode mapping = binding.path("sections").isArray()
                ? (ArrayNode) binding.path("sections")
                : binding.putArray("sections");
        while (mapping.size() < scaleSections.size()) {
            mapping.addObject();
        }
        for (JsonNode item : mapping) {
            if (item instanceof ObjectNode entry && !entry.hasNonNull("sectionId") && entry.path("sectionIndex").isInt()) {
                int index = entry.path("sectionIndex").asInt();
                if (index >= 0 && index < sectionIds.size()) {
                    entry.put("sectionId", sectionIds.get(index).toString());
                }
            }
        }
        List<TestSection> created = sections.findByTestOrderByOrderIndexAsc(test);
        Set<UUID> used = new HashSet<>();
        for (JsonNode item : mapping) {
            if (item.path("sectionId").isTextual()) {
                try {
                    used.add(UUID.fromString(item.path("sectionId").asText()));
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
        int index = 0;
        for (JsonNode scaleSection : scaleSections) {
            ObjectNode entry = (ObjectNode) mapping.get(index);
            index++;
            if (entry.hasNonNull("sectionId")) {
                continue;
            }
            String type = scaleSection.path("sectionType").asText("");
            if (type.isBlank()) {
                type = scaleSection.path("name").asText("").toUpperCase(Locale.ROOT);
            }
            final String expected = type;
            created.stream()
                    .filter(section -> !used.contains(section.getId()) && section.getSectionType().name().equals(expected))
                    .findFirst()
                    .ifPresent(section -> {
                        used.add(section.getId());
                        entry.put("sectionId", section.getId().toString());
                    });
        }
        tests.save(test);
    }

    private List<UUID> applyTemplateSections(ExamTest test, JsonNode sectionsNode) {
        List<UUID> created = new ArrayList<>();
        if (sectionsNode == null || !sectionsNode.isArray() || sectionsNode.isEmpty()) {
            TestSection section = new TestSection();
            section.setId(UUID.randomUUID());
            section.setTest(test);
            section.setTitle("Section 1");
            section.setInstructions("");
            section.setItems(ContentNodes.array());
            section.setOrderIndex(0);
            section.setSectionType(SectionType.CUSTOM);
            sections.save(section);
            created.add(section.getId());
            return created;
        }
        int index = 0;
        for (JsonNode sectionPreset : sectionsNode) {
            TestSection section = new TestSection();
            section.setId(UUID.randomUUID());
            section.setTest(test);
            section.setTitle(sectionPreset.path("title").asText("Section"));
            section.setInstructions(sectionPreset.path("instructions").asText(""));
            section.setItems(ContentNodes.array());
            section.setOrderIndex(index++);
            String type = sectionPreset.path("sectionType").asText("CUSTOM");
            try {
                section.setSectionType(SectionType.valueOf(type));
            } catch (IllegalArgumentException ex) {
                section.setSectionType(SectionType.CUSTOM);
            }
            JsonNode minutes = sectionPreset.get("timeLimitMinutes");
            if (minutes != null && !minutes.isNull()) {
                section.setTimeLimitMinutes(minutes.asInt());
            }
            JsonNode seconds = sectionPreset.get("timeLimitSeconds");
            if (seconds != null && !seconds.isNull() && seconds.asInt() > 0) {
                section.setTimeLimitSeconds(seconds.asInt());
            }
            JsonNode backQ = sectionPreset.get("allowBackToQuestions");
            if (backQ != null && !backQ.isNull()) {
                section.setAllowBackToQuestions(backQ.asBoolean());
            }
            JsonNode backP = sectionPreset.get("allowBackToPart");
            if (backP != null && !backP.isNull()) {
                section.setAllowBackToPart(backP.asBoolean());
            }
            JsonNode speakingFlow = sectionPreset.get("speakingAutoFlow");
            if (speakingFlow != null && !speakingFlow.isNull()) {
                section.setSpeakingAutoFlow(speakingFlow.asBoolean());
            }
            sections.save(section);
            created.add(section.getId());
            JsonNode partsNode = sectionPreset.path("parts");
            if (partsNode.isArray()) {
                int partIndex = 0;
                for (JsonNode partPreset : partsNode) {
                    SectionPart part = new SectionPart();
                    part.setId(UUID.randomUUID());
                    part.setSection(section);
                    part.setTitle(partPreset.path("title").asText("Part"));
                    part.setInstructions("");
                    part.setItems(ContentNodes.array());
                    part.setOrderIndex(partIndex++);
                    JsonNode oq = partPreset.get("oneQuestionPerPage");
                    if (oq != null && !oq.isNull()) {
                        part.setOneQuestionPerPage(oq.asBoolean());
                    }
                    JsonNode partMinutes = partPreset.get("timeLimitMinutes");
                    if (partMinutes != null && !partMinutes.isNull()) {
                        part.setTimeLimitMinutes(partMinutes.asInt());
                    }
                    JsonNode partSeconds = partPreset.get("timeLimitSeconds");
                    if (partSeconds != null && !partSeconds.isNull()) {
                        part.setTimeLimitSeconds(partSeconds.asInt());
                    }
                    JsonNode advancePart = partPreset.get("autoAdvanceOnTimeout");
                    if (advancePart != null && !advancePart.isNull()) {
                        part.setAutoAdvanceOnTimeout(advancePart.asBoolean());
                    }
                    parts.save(part);
                }
            }
        }
        return created;
    }

    @Transactional(readOnly = true)
    public ObjectNode get(UUID ownerId, UUID testId) {
        return detail(access.requireOwned(testId, ownerId));
    }

    @Transactional(readOnly = true)
    public ObjectNode preview(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        return views.publicView(views.snapshot(test), test.getSettings());
    }

    @Transactional
    public ObjectNode update(UUID ownerId, UUID testId, UpdateTestRequest request) {
        ExamTest test = access.requireOwned(testId, ownerId);
        test.setTitle(request.title().trim());
        test.setDescription(request.description() == null ? "" : request.description().trim());
        if (request.settings() != null) {
            test.setSettings(cleanSettings(request.settings()));
        }
        test.setUpdatedAt(OffsetDateTime.now());
        tests.save(test);
        return detail(test);
    }

    @Transactional
    public ObjectNode duplicate(UUID ownerId, UUID testId) {
        ExamTest source = access.requireOwned(testId, ownerId);
        ExamTest copy = copies.copy(source, source.getOwner(), TestCopyService.CopyOptions.selfDuplicate());
        return detail(copy);
    }

    @Transactional
    public void delete(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        String title = test.getTitle();
        tests.delete(test);
        audit.record(ownerId, "TEST_DELETED", "TEST", testId, audit.details("title", title));
    }

    @Transactional
    public ObjectNode publish(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        if (questions.countByTestId(test.getId()) == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_TEST", "В тесте нет заданий");
        }
        int sectionNumber = 0;
        for (TestSection section : sections.findByTestOrderByOrderIndexAsc(test)) {
            sectionNumber++;
            int questionNumber = 0;
            for (Question question : questions.findBySectionOrderByOrderIndexAsc(section)) {
                questionNumber++;
                try {
                    engines.validateStored(question, ContentCheck.publication(test.getExamPreset()));
                } catch (ApiException exception) {
                    String where = "Секция " + sectionNumber + ", задание " + questionNumber;
                    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", where + ": " + exception.getMessage(),
                            Map.of("questionId", question.getId().toString()));
                }
            }
        }
        int next = versions.findFirstByTestOrderByVersionNumberDesc(test).map(v -> v.getVersionNumber() + 1).orElse(1);
        TestVersion version = new TestVersion();
        version.setId(UUID.randomUUID());
        version.setTest(test);
        version.setVersionNumber(next);
        version.setContentSnapshot(views.snapshot(test));
        version.setSettingsSnapshot(test.getSettings().deepCopy());
        version.setPublishedAt(OffsetDateTime.now());
        versions.save(version);
        openLink(test, false);
        test.setStatus(TestStatus.PUBLISHED);
        test.setUpdatedAt(version.getPublishedAt());
        audit.record(ownerId, "TEST_PUBLISHED", "TEST", test.getId(), audit.details("title", test.getTitle()).put("version", next));
        return detail(test);
    }

    @Transactional
    public ObjectNode revokeLink(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        test.setPublicToken(null);
        test.setPublicTokenExpiresAt(null);
        test.setUpdatedAt(OffsetDateTime.now());
        audit.record(ownerId, "LINK_REVOKED", "TEST", test.getId(), audit.details("title", test.getTitle()));
        return detail(test);
    }

    @Transactional
    public ObjectNode rotateLink(UUID ownerId, UUID testId) {
        ExamTest test = access.requireOwned(testId, ownerId);
        if (test.getStatus() != TestStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_PUBLISHED", "Сначала опубликуйте тест");
        }
        openLink(test, true);
        audit.record(ownerId, "LINK_ROTATED", "TEST", test.getId(), audit.details("title", test.getTitle()));
        return detail(test);
    }

    @Transactional(readOnly = true)
    public ObjectNode overview(UUID ownerId) {
        var owner = access.requireUser(ownerId);
        ObjectNode node = mapper.createObjectNode();
        node.put("drafts", tests.countByOwnerAndStatusAndListedTrue(owner, TestStatus.DRAFT));
        node.put("published", tests.countByOwnerAndStatusAndListedTrue(owner, TestStatus.PUBLISHED));
        node.put("needsReview", attempts.countByStatusAndTestVersionTestOwnerId(AttemptStatus.NEEDS_REVIEW, ownerId));
        var recent = tests.searchOwned(owner, null, null, "", PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "updatedAt")));
        var recentNodes = node.putArray("recent");
        recent.forEach(item -> recentNodes.add(summary(item)));
        return node;
    }

    public ObjectNode detail(ExamTest test) {
        var latest = versions.findFirstByTestOrderByVersionNumberDesc(test).orElse(null);
        ObjectNode node = views.detail(test, latest);
        node.put("accessStatus", accessStatus(test, latest));
        JsonNode raw = test.getSettings();
        node.set("settings", cleanSettings(raw == null || raw.isNull() ? mapper.createObjectNode() : raw));
        return node;
    }

    public ObjectNode summary(ExamTest test) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", test.getId().toString());
        node.put("title", test.getTitle());
        if (test.getExamPreset() != null) {
            node.put("examPreset", test.getExamPreset());
        } else {
            node.putNull("examPreset");
        }
        node.put("status", test.getStatus().name());
        node.put("questionCount", views.questionCount(test));
        node.put("updatedAt", test.getUpdatedAt().toString());
        var latest = test.getStatus() == TestStatus.PUBLISHED
                ? versions.findFirstByTestOrderByVersionNumberDesc(test).orElse(null)
                : null;
        node.put("accessStatus", accessStatus(test, latest));
        node.put("hasUnpublishedChanges", latest != null && test.getUpdatedAt().isAfter(latest.getPublishedAt()));
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
        if (test.getSharedFromName() != null && !test.getSharedFromName().isBlank()) {
            node.put("sharedFromName", test.getSharedFromName());
        }
        return node;
    }

    private void openLink(ExamTest test, boolean replaceToken) {
        if (replaceToken || test.getPublicToken() == null) {
            test.setPublicToken(Tokens.random());
        }
        int hours = platform.linkLifetimeHours();
        test.setPublicTokenExpiresAt(hours <= 0 ? null : OffsetDateTime.now().plusHours(hours));
    }

    public ObjectNode cleanSettings(JsonNode source) {
        ObjectNode settings = mapper.createObjectNode();
        settings.put("requireParticipantName", true);
        boolean emailResultToParticipant = source.path("emailResultToParticipant").asBoolean(false);
        boolean requireParticipantEmail = source.path("requireParticipantEmail").asBoolean(true);
        if (emailResultToParticipant) {
            requireParticipantEmail = true;
        }
        settings.put("requireParticipantEmail", requireParticipantEmail);
        settings.putNull("accessCode");
        settings.put("allowBackToQuestions", source.path("allowBackToQuestions").asBoolean(true));
        settings.put("allowBackToPart", source.path("allowBackToPart").asBoolean(true));
        settings.put("allowBackToSection", source.path("allowBackToSection").asBoolean(true));
        settings.put("shuffleChoices", source.path("shuffleChoices").asBoolean(false));
        settings.put("audioAutoStart", source.path("audioAutoStart").asBoolean(false));
        boolean videoAutoStart = source.has("videoAutoStart")
                ? source.path("videoAutoStart").asBoolean(false)
                : source.path("audioAutoStart").asBoolean(false);
        settings.put("videoAutoStart", videoAutoStart);
        String numberFormat = source.path("questionNumberFormat").asText("1");
        if (!numberFormat.equals("1")
                && !numberFormat.equals("1.")
                && !numberFormat.equals("1)")
                && !numberFormat.equals("(1)")
                && !numberFormat.equals("Q1")
                && !numberFormat.equals("Question 1")) {
            numberFormat = "1";
        }
        settings.put("questionNumberFormat", numberFormat);
        String numberScope = source.path("questionNumberScope").asText("test");
        if (!numberScope.equals("test")
                && !numberScope.equals("section")
                && !numberScope.equals("part")) {
            numberScope = "test";
        }
        String examType = source.path("examType").asText("CUSTOM");
        if (!examType.equals("CUSTOM")
                && !examType.equals("IELTS")
                && !examType.equals("TOEFL")
                && !examType.equals("TOEIC")) {
            examType = "CUSTOM";
        }
        settings.put("examType", examType);
        if (examType.equals("TOEFL")) {
            numberScope = "part";
        }
        settings.put("questionNumberScope", numberScope);
        settings.put("oneQuestionPerPage", source.path("oneQuestionPerPage").asBoolean(true));
        String errorExplanationMode = source.path("errorExplanationMode").asText("off");
        if (!errorExplanationMode.equals("off")
                && !errorExplanationMode.equals("during")
                && !errorExplanationMode.equals("after")
                && !errorExplanationMode.equals("both")) {
            errorExplanationMode = "off";
        }
        settings.put("errorExplanationMode", errorExplanationMode);
        JsonNode focusLoss = source.path("focusLossMaxWarnings");
        if (focusLoss.isNumber() && focusLoss.asInt() > 0) {
            if (focusLoss.asInt() > 20) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Не больше 20 предупреждений");
            }
            settings.put("focusLossMaxWarnings", focusLoss.asInt());
        } else {
            settings.putNull("focusLossMaxWarnings");
        }
        settings.put("showResultToParticipant", source.path("showResultToParticipant").asBoolean(true));
        settings.put("resultDetail", ResultDisplay.normalizeDetail(source));
        JsonNode attempts = source.path("maxAttempts");
        if (attempts.isNumber() && attempts.asInt() > 0) {
            if (attempts.asInt() > 100) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Не больше 100 попыток");
            }
            settings.put("maxAttempts", attempts.asInt());
        } else {
            settings.putNull("maxAttempts");
        }
        JsonNode limit = source.path("timeLimitMinutes");
        if (limit.isNumber() && limit.asInt() > 0) {
            if (limit.asInt() > 600) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Лимит теста не больше 600 минут");
            }
            settings.put("timeLimitMinutes", limit.asInt());
        } else {
            settings.putNull("timeLimitMinutes");
        }
        settings.put("allowEarlySubmit", source.path("allowEarlySubmit").asBoolean(true));
        settings.put("autoAdvanceOnQuestionTimeout", source.path("autoAdvanceOnQuestionTimeout").asBoolean(false));
        settings.put("autoAdvanceOnPartTimeout", source.path("autoAdvanceOnPartTimeout").asBoolean(false));
        settings.put("pausePartTimerDuringAudio", source.path("pausePartTimerDuringAudio").asBoolean(false));
        ArrayNode sectionTypes = settings.putArray("timeLimitSectionTypes");
        JsonNode typesNode = source.path("timeLimitSectionTypes");
        if (typesNode.isArray()) {
            for (JsonNode type : typesNode) {
                if (!type.isTextual()) {
                    continue;
                }
                String name = type.asText().trim().toUpperCase();
                if (name.equals("LISTENING") || name.equals("READING") || name.equals("WRITING")
                        || name.equals("SPEAKING") || name.equals("CUSTOM")) {
                    sectionTypes.add(name);
                }
            }
        }
        OffsetDateTime from = moment(source.path("availableFrom"), "availableFrom");
        OffsetDateTime until = moment(source.path("availableUntil"), "availableUntil");
        if (from != null && until != null && !until.isAfter(from)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Окончание доступа должно быть позже начала");
        }
        putMoment(settings, "availableFrom", from);
        putMoment(settings, "availableUntil", until);
        settings.put("emailResultToParticipant", emailResultToParticipant);
        JsonNode scale = source.path("scoreScale");
        if (scale.isObject() && scale.path("scale").isObject() && scale.path("sections").isArray()) {
            if (scale.toString().length() > 100_000) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Слишком большая шкала");
            }
            settings.set("scoreScale", scale.deepCopy());
        } else {
            settings.putNull("scoreScale");
        }
        return settings;
    }

    private OffsetDateTime moment(JsonNode value, String field) {
        if (!value.isTextual() || value.asText().isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value.asText());
        } catch (DateTimeParseException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Некорректная дата доступа", Map.of(field, "Некорректная дата"));
        }
    }

    private void putMoment(ObjectNode settings, String field, OffsetDateTime value) {
        if (value == null) {
            settings.putNull(field);
        } else {
            settings.put(field, value.toString());
        }
    }
}
