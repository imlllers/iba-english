package com.iba.testing.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.audit.AuditEvent;
import com.iba.testing.audit.AuditEventRepository;
import com.iba.testing.audit.AuditService;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestRepository;
import com.iba.testing.test.ExamTestService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminCatalogService {

    private final ExamTestRepository tests;
    private final ExamTestService examTests;
    private final AuditEventRepository events;
    private final AuditService audit;
    private final ObjectMapper mapper;

    public AdminCatalogService(ExamTestRepository tests, ExamTestService examTests, AuditEventRepository events,
                               AuditService audit, ObjectMapper mapper) {
        this.tests = tests;
        this.examTests = examTests;
        this.events = events;
        this.audit = audit;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> tests(String query, String status, int page, int size) {
        String q = query == null ? "" : query.trim();
        return examTests.pageByAccess(status, page, size, (stored, pageable) -> tests.searchAll(stored, q, pageable), this::testNode);
    }

    @Transactional
    public void delete(UUID actorId, UUID testId) {
        ExamTest test = tests.findById(testId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Тест не найден"));
        String title = test.getTitle();
        String email = test.getOwner().getEmail();
        tests.delete(test);
        audit.record(actorId, "TEST_DELETED_BY_ADMIN", "TEST", testId,
                audit.details("title", title).put("email", email));
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> audit(String query, int page, int size) {
        var result = events.search(query == null ? "" : query.trim(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(result.map(this::eventNode).toList(), page, size, result.getTotalElements());
    }

    private ObjectNode testNode(ExamTest test) {
        ObjectNode node = examTests.summary(test);
        node.put("ownerEmail", test.getOwner().getEmail());
        node.put("ownerName", test.getOwner().getDisplayName());
        return node;
    }

    private ObjectNode eventNode(AuditEvent event) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", event.getId().toString());
        node.put("action", event.getAction());
        node.put("targetType", event.getTargetType());
        if (event.getTargetId() == null) {
            node.putNull("targetId");
        } else {
            node.put("targetId", event.getTargetId().toString());
        }
        node.put("actorEmail", event.getActor() == null ? "" : event.getActor().getEmail());
        node.put("createdAt", event.getCreatedAt().toString());
        node.set("details", event.getDetails());
        return node;
    }
}
