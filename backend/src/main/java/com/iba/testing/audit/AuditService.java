package com.iba.testing.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditEventRepository events;
    private final UserAccountRepository users;
    private final ObjectMapper mapper;

    public AuditService(AuditEventRepository events, UserAccountRepository users, ObjectMapper mapper) {
        this.events = events;
        this.users = users;
        this.mapper = mapper;
    }

    public void record(UUID actorId, String action, String targetType, UUID targetId, JsonNode details) {
        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        if (actorId != null) {
            users.findById(actorId).ifPresent(event::setActor);
        }
        event.setAction(action);
        event.setTargetType(targetType);
        event.setTargetId(targetId);
        event.setDetails(details == null ? mapper.createObjectNode() : details);
        event.setCreatedAt(OffsetDateTime.now());
        events.save(event);
    }

    public void record(UUID actorId, String action, String targetType, UUID targetId) {
        record(actorId, action, targetType, targetId, mapper.createObjectNode());
    }

    public ObjectNode details(String key, String value) {
        ObjectNode node = mapper.createObjectNode();
        node.put(key, value);
        return node;
    }

    public UserAccount actor(UUID id) {
        return users.findById(id).orElse(null);
    }
}
