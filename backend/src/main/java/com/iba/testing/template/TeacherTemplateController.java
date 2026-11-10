package com.iba.testing.template;

import com.iba.testing.security.CurrentUser;
import com.iba.testing.template.dto.TemplateWriteRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher/templates")
public class TeacherTemplateController {

    private final ExamTemplateService templates;

    public TeacherTemplateController(ExamTemplateService templates) {
        this.templates = templates;
    }

    @GetMapping
    public Object list() {
        return templates.list(CurrentUser.require().getId());
    }

    @GetMapping("/{id}")
    public Object get(@PathVariable UUID id) {
        return templates.get(CurrentUser.require().getId(), id);
    }

    @PostMapping
    public Object create(@Valid @RequestBody TemplateWriteRequest request) {
        return templates.create(CurrentUser.require().getId(), request);
    }

    @PutMapping("/{id}")
    public Object update(@PathVariable UUID id, @Valid @RequestBody TemplateWriteRequest request) {
        return templates.update(CurrentUser.require().getId(), id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        templates.delete(CurrentUser.require().getId(), id);
    }

    @PostMapping("/{id}/reset")
    public Object reset(@PathVariable UUID id) {
        return templates.reset(CurrentUser.require().getId(), id);
    }
}
