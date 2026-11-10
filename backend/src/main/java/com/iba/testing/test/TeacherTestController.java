package com.iba.testing.test;

import com.iba.testing.preset.PresetCatalog;
import com.iba.testing.question.QuestionWriteRequest;
import com.iba.testing.section.ContentService;
import com.iba.testing.section.MaterialBlockWriteRequest;
import com.iba.testing.section.PartWriteRequest;
import com.iba.testing.section.SectionWriteRequest;
import com.iba.testing.security.CurrentUser;
import com.iba.testing.test.dto.CreateTestRequest;
import com.iba.testing.test.dto.UpdateTestRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
public class TeacherTestController {

    private final ExamTestService tests;
    private final ContentService content;
    private final PresetCatalog presets;

    public TeacherTestController(ExamTestService tests, ContentService content, PresetCatalog presets) {
        this.tests = tests;
        this.content = content;
        this.presets = presets;
    }

    @GetMapping("/overview")
    public Object overview() {
        return tests.overview(CurrentUser.require().getId());
    }

    @GetMapping("/presets")
    public Object presets() {
        return presets.all();
    }

    @GetMapping("/tests")
    public Object list(@RequestParam(defaultValue = "") String q,
                       @RequestParam(required = false) String status,
                       @RequestParam(required = false) String examPreset,
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size) {
        return tests.list(CurrentUser.require().getId(), q, status, examPreset, page, bounded(size));
    }

    @PostMapping("/tests")
    public Object create(@Valid @RequestBody CreateTestRequest request) {
        return tests.create(CurrentUser.require().getId(), request);
    }

    @GetMapping("/tests/{id}")
    public Object get(@PathVariable UUID id) {
        return tests.get(CurrentUser.require().getId(), id);
    }

    @PutMapping("/tests/{id}")
    public Object update(@PathVariable UUID id, @Valid @RequestBody UpdateTestRequest request) {
        return tests.update(CurrentUser.require().getId(), id, request);
    }

    @PostMapping("/tests/{id}/publish")
    public Object publish(@PathVariable UUID id) {
        return tests.publish(CurrentUser.require().getId(), id);
    }

    @PostMapping("/tests/{id}/duplicate")
    public Object duplicate(@PathVariable UUID id) {
        return tests.duplicate(CurrentUser.require().getId(), id);
    }

    @DeleteMapping("/tests/{id}")
    public void delete(@PathVariable UUID id) {
        tests.delete(CurrentUser.require().getId(), id);
    }

    @GetMapping("/tests/{id}/preview")
    public Object preview(@PathVariable UUID id) {
        return tests.preview(CurrentUser.require().getId(), id);
    }

    @PostMapping("/tests/{id}/link/revoke")
    public Object revokeLink(@PathVariable UUID id) {
        return tests.revokeLink(CurrentUser.require().getId(), id);
    }

    @PostMapping("/tests/{id}/link/rotate")
    public Object rotateLink(@PathVariable UUID id) {
        return tests.rotateLink(CurrentUser.require().getId(), id);
    }

    @PostMapping("/tests/{id}/sections/{sectionId}/questions/reorder")
    public Object reorderQuestions(@PathVariable UUID id, @PathVariable UUID sectionId, @RequestBody IdListRequest request) {
        return content.reorderQuestions(CurrentUser.require().getId(), id, sectionId, request.ids());
    }

    @PostMapping("/tests/{id}/sections/{sectionId}/questions/{questionId}/place")
    public Object placeQuestion(@PathVariable UUID id, @PathVariable UUID sectionId, @PathVariable UUID questionId,
                                @RequestBody PlaceQuestionRequest request) {
        return content.placeQuestion(CurrentUser.require().getId(), id, sectionId, questionId,
                request.materialBlockId(), request.beforeId(), request.afterId(), request.partId());
    }

    @PostMapping("/tests/{id}/questions/{questionId}/duplicate")
    public Object duplicateQuestion(@PathVariable UUID id, @PathVariable UUID questionId) {
        return content.duplicateQuestion(CurrentUser.require().getId(), id, questionId);
    }

    @PostMapping("/tests/{id}/sections")
    public Object addSection(@PathVariable UUID id, @Valid @RequestBody SectionWriteRequest request) {
        return content.addSection(CurrentUser.require().getId(), id, request);
    }

    @PutMapping("/tests/{id}/sections/{sectionId}")
    public Object updateSection(@PathVariable UUID id, @PathVariable UUID sectionId, @Valid @RequestBody SectionWriteRequest request) {
        return content.updateSection(CurrentUser.require().getId(), id, sectionId, request);
    }

    @DeleteMapping("/tests/{id}/sections/{sectionId}")
    public Object deleteSection(@PathVariable UUID id, @PathVariable UUID sectionId) {
        return content.deleteSection(CurrentUser.require().getId(), id, sectionId);
    }

    @PostMapping("/tests/{id}/sections/{sectionId}/parts")
    public Object addPart(@PathVariable UUID id, @PathVariable UUID sectionId) {
        return content.addPart(CurrentUser.require().getId(), id, sectionId);
    }

    @PutMapping("/tests/{id}/sections/{sectionId}/parts/{partId}")
    public Object updatePart(@PathVariable UUID id, @PathVariable UUID sectionId, @PathVariable UUID partId,
                             @Valid @RequestBody PartWriteRequest request) {
        return content.updatePart(CurrentUser.require().getId(), id, sectionId, partId, request);
    }

    @DeleteMapping("/tests/{id}/sections/{sectionId}/parts/{partId}")
    public Object deletePart(@PathVariable UUID id, @PathVariable UUID sectionId, @PathVariable UUID partId) {
        return content.deletePart(CurrentUser.require().getId(), id, sectionId, partId);
    }

    @PostMapping("/tests/{id}/sections/{sectionId}/material-blocks")
    public Object addMaterialBlock(@PathVariable UUID id, @PathVariable UUID sectionId,
                                   @RequestBody(required = false) BlockCreateRequest request) {
        return content.addMaterialBlock(CurrentUser.require().getId(), id, sectionId,
                request == null ? null : request.partId());
    }

    @PutMapping("/tests/{id}/sections/{sectionId}/material-blocks/{blockId}")
    public Object updateMaterialBlock(@PathVariable UUID id, @PathVariable UUID sectionId, @PathVariable UUID blockId,
                                      @Valid @RequestBody MaterialBlockWriteRequest request) {
        return content.updateMaterialBlock(CurrentUser.require().getId(), id, sectionId, blockId, request);
    }

    @DeleteMapping("/tests/{id}/sections/{sectionId}/material-blocks/{blockId}")
    public Object deleteMaterialBlock(@PathVariable UUID id, @PathVariable UUID sectionId, @PathVariable UUID blockId) {
        return content.deleteMaterialBlock(CurrentUser.require().getId(), id, sectionId, blockId);
    }

    @PostMapping("/tests/{id}/sections/{sectionId}/questions")
    public Object addQuestion(@PathVariable UUID id, @PathVariable UUID sectionId, @RequestBody TypeRequest request) {
        return content.addQuestion(CurrentUser.require().getId(), id, sectionId, request.type(),
                request.count() == null ? 1 : request.count(), request.partId(), request.materialBlockId(),
                Boolean.TRUE.equals(request.demo()));
    }

    @PutMapping("/tests/{id}/questions/{questionId}")
    public Object updateQuestion(@PathVariable UUID id, @PathVariable UUID questionId, @Valid @RequestBody QuestionWriteRequest request) {
        return content.updateQuestion(CurrentUser.require().getId(), id, questionId, request);
    }

    @DeleteMapping("/tests/{id}/questions/{questionId}")
    public Object deleteQuestion(@PathVariable UUID id, @PathVariable UUID questionId) {
        return content.deleteQuestion(CurrentUser.require().getId(), id, questionId);
    }

    private int bounded(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    public record IdListRequest(List<UUID> ids) {
    }

    public record PlaceQuestionRequest(UUID materialBlockId, UUID beforeId, UUID afterId, UUID partId) {
    }

    public record TypeRequest(String type, Integer count, UUID partId, UUID materialBlockId, Boolean demo) {
    }

    public record BlockCreateRequest(UUID partId) {
    }
}
