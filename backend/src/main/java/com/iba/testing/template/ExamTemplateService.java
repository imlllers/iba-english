package com.iba.testing.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.preset.PresetCatalog;
import com.iba.testing.scale.ScoreScaleService;
import com.iba.testing.template.dto.TemplateWriteRequest;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ExamTemplateService {

    private final ExamTemplateRepository templates;
    private final UserAccountRepository users;
    private final PresetCatalog catalog;
    private final ScoreScaleService scales;
    private final ObjectMapper mapper;

    public ExamTemplateService(
            ExamTemplateRepository templates,
            UserAccountRepository users,
            PresetCatalog catalog,
            ScoreScaleService scales,
            ObjectMapper mapper) {
        this.templates = templates;
        this.users = users;
        this.catalog = catalog;
        this.scales = scales;
        this.mapper = mapper;
    }

    @Transactional
    public List<ObjectNode> list(UUID ownerId) {
        seedIfEmpty(ownerId);
        return templates.findByOwnerIdOrderByBuiltinKeyAscTitleAsc(ownerId).stream().map(this::toJson).toList();
    }

    @Transactional(readOnly = true)
    public ObjectNode get(UUID ownerId, UUID id) {
        return toJson(requireOwned(ownerId, id));
    }

    @Transactional
    public ObjectNode create(UUID ownerId, TemplateWriteRequest request) {
        UserAccount owner = users.findById(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Пользователь не найден"));
        validateSections(request.sections());
        OffsetDateTime now = OffsetDateTime.now();
        ExamTemplate template = new ExamTemplate();
        template.setId(UUID.randomUUID());
        template.setOwner(owner);
        template.setTitle(request.title().trim());
        template.setFamily("CUSTOM");
        template.setBuiltinKey(null);
        template.setSections(request.sections());
        template.setDefaultSettings(request.defaultSettings());
        template.setCreatedAt(now);
        template.setUpdatedAt(now);
        templates.save(template);
        return toJson(template);
    }

    @Transactional
    public ObjectNode update(UUID ownerId, UUID id, TemplateWriteRequest request) {
        ExamTemplate template = requireOwned(ownerId, id);
        validateSections(request.sections());
        template.setTitle(request.title().trim());
        template.setSections(request.sections());
        template.setDefaultSettings(request.defaultSettings());
        template.setUpdatedAt(OffsetDateTime.now());
        templates.save(template);
        return toJson(template);
    }

    @Transactional
    public void delete(UUID ownerId, UUID id) {
        ExamTemplate template = requireOwned(ownerId, id);
        if (template.isBuiltin()) {
            throw new ApiException(HttpStatus.CONFLICT, "BUILTIN_TEMPLATE", "Встроенный шаблон нельзя удалить");
        }
        templates.delete(template);
    }

    @Transactional
    public ObjectNode reset(UUID ownerId, UUID id) {
        ExamTemplate template = requireOwned(ownerId, id);
        if (!template.isBuiltin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOT_BUILTIN", "Сбросить можно только встроенный шаблон");
        }
        var preset = catalog.find(template.getBuiltinKey());
        if (preset == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PRESET_MISSING", "Каталог пресета не найден");
        }
        applyPreset(template, preset);
        template.setUpdatedAt(OffsetDateTime.now());
        templates.save(template);
        return toJson(template);
    }

    @Transactional(readOnly = true)
    public ExamTemplate requireOwned(UUID ownerId, UUID id) {
        return templates.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Шаблон не найден"));
    }

    private void seedIfEmpty(UUID ownerId) {
        if (templates.countByOwnerId(ownerId) > 0) {
            return;
        }
        UserAccount owner = users.findLockedById(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Пользователь не найден"));
        if (templates.countByOwnerId(ownerId) > 0) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (var preset : catalog.all()) {
            ExamTemplate template = new ExamTemplate();
            template.setId(UUID.randomUUID());
            template.setOwner(owner);
            template.setBuiltinKey(preset.id());
            template.setFamily(preset.family());
            template.setCreatedAt(now);
            template.setUpdatedAt(now);
            applyPreset(template, preset);
            templates.save(template);
        }
    }

    private void applyPreset(ExamTemplate template, PresetCatalog.ExamPreset preset) {
        template.setTitle(preset.title());
        template.setFamily(preset.family());
        template.setSections(mapper.valueToTree(preset.sections()));
        ObjectNode settings = mapper.valueToTree(preset.defaultSettings());
        JsonNode scale = scales.ownerCopy(template.getOwner().getId(), preset.family().toLowerCase(java.util.Locale.ROOT));
        if (scale != null) {
            ObjectNode binding = settings.putObject("scoreScale");
            binding.put("sourceId", scale.path("id").asText());
            binding.set("scale", scale);
            binding.putArray("sections");
        }
        template.setDefaultSettings(settings);
    }

    private void validateSections(JsonNode sections) {
        if (sections == null || !sections.isArray() || sections.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Добавьте хотя бы одну секцию");
        }
        for (JsonNode section : sections) {
            if (section.path("title").asText("").isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "У секции нужно название");
            }
            String type = section.path("sectionType").asText("");
            if (type.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "У секции нужен тип");
            }
        }
    }

    private ObjectNode toJson(ExamTemplate template) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", template.getId().toString());
        node.put("title", template.getTitle());
        node.put("family", template.getFamily());
        if (template.getBuiltinKey() == null) {
            node.putNull("builtinKey");
        } else {
            node.put("builtinKey", template.getBuiltinKey());
        }
        node.put("builtin", template.isBuiltin());
        node.set("sections", template.getSections() == null ? mapper.createArrayNode() : template.getSections());
        node.set("defaultSettings", template.getDefaultSettings() == null ? mapper.createObjectNode() : template.getDefaultSettings());
        node.put("createdAt", template.getCreatedAt().toString());
        node.put("updatedAt", template.getUpdatedAt().toString());
        return node;
    }

    public static ArrayNode emptyCustomSections(ObjectMapper mapper) {
        ArrayNode sections = mapper.createArrayNode();
        ObjectNode section = sections.addObject();
        section.put("title", "Section 1");
        section.put("sectionType", "CUSTOM");
        section.putNull("timeLimitMinutes");
        section.put("instructions", "");
        section.putNull("allowBackToQuestions");
        section.putNull("allowBackToPart");
        section.putArray("parts");
        return sections;
    }
}
