package com.iba.testing.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final NotificationPreferencesRepository preferences;
    private final ObjectMapper mapper;

    public NotificationService(NotificationRepository notifications, NotificationPreferencesRepository preferences, ObjectMapper mapper) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.mapper = mapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notify(UUID userId, NotificationType type, String title, String body, String link, String dedupeKey) {
        notifyWithPayload(userId, type, title, body, link, dedupeKey, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyWithPayload(UUID userId, NotificationType type, String title, String body, String link,
                                  String dedupeKey, JsonNode payload) {
        if (dedupeKey != null && notifications.existsByUserIdAndDedupeKey(userId, dedupeKey)) {
            return;
        }
        if (!skipsPreferences(type) && !preferencesOf(userId).path(type.name()).path("app").asBoolean(true)) {
            return;
        }
        Notification item = new Notification();
        item.setId(UUID.randomUUID());
        item.setUserId(userId);
        item.setType(type);
        item.setTitle(title.length() > 200 ? title.substring(0, 200) : title);
        item.setBody(body == null ? "" : body);
        item.setLink(link);
        item.setDedupeKey(dedupeKey);
        item.setPayload(payload);
        item.setCreatedAt(OffsetDateTime.now());
        notifications.save(item);
    }

    @Transactional
    public void resolveShare(UUID userId, String dedupeKey, String status) {
        notifications.findByUserIdAndDedupeKey(userId, dedupeKey).ifPresent(item -> {
            if (item.getReadAt() == null) {
                item.setReadAt(OffsetDateTime.now());
            }
            ObjectNode payload = item.getPayload() == null || item.getPayload().isNull()
                    ? mapper.createObjectNode()
                    : item.getPayload().deepCopy();
            payload.put("status", status);
            item.setPayload(payload);
        });
    }

    private boolean skipsPreferences(NotificationType type) {
        return type == NotificationType.TEST_SHARED
                || type == NotificationType.TEST_SHARE_ACCEPTED
                || type == NotificationType.TEST_SHARE_DECLINED
                || type == NotificationType.TEACHER_REGISTERED
                || type == NotificationType.INVITE_EXPIRED;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> list(UUID userId, int page, int size) {
        var result = notifications.findByUserIdAndHiddenFalseOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
        return new PageResponse<>(result.map(this::view).toList(), page, size, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public long unread(UUID userId) {
        return notifications.countByUserIdAndHiddenFalseAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID id) {
        Notification item = notifications.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Уведомление не найдено"));
        if (item.getReadAt() == null) {
            item.setReadAt(OffsetDateTime.now());
        }
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notifications.markAllRead(userId, OffsetDateTime.now());
    }

    @Transactional
    public void clear(UUID userId) {
        notifications.hideAll(userId, OffsetDateTime.now());
    }

    @Transactional(readOnly = true)
    public ObjectNode preferences(UUID userId) {
        JsonNode stored = preferencesOf(userId);
        ObjectNode result = mapper.createObjectNode();
        for (NotificationType type : NotificationType.values()) {
            ObjectNode item = result.putObject(type.name());
            item.put("app", stored.path(type.name()).path("app").asBoolean(true));
        }
        return result;
    }

    @Transactional
    public ObjectNode savePreferences(UUID userId, JsonNode body) {
        if (body == null || !body.isObject()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Ожидаются настройки уведомлений");
        }
        ObjectNode clean = mapper.createObjectNode();
        for (NotificationType type : NotificationType.values()) {
            JsonNode given = body.path(type.name());
            ObjectNode item = clean.putObject(type.name());
            item.put("app", given.path("app").asBoolean(true));
        }
        NotificationPreferences row = preferences.findById(userId).orElseGet(() -> {
            NotificationPreferences created = new NotificationPreferences();
            created.setUserId(userId);
            return created;
        });
        row.setPrefs(clean);
        row.setUpdatedAt(OffsetDateTime.now());
        preferences.save(row);
        return preferences(userId);
    }

    private JsonNode preferencesOf(UUID userId) {
        return preferences.findById(userId).map(NotificationPreferences::getPrefs).orElseGet(mapper::createObjectNode);
    }

    private ObjectNode view(Notification item) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", item.getId().toString());
        node.put("type", item.getType().name());
        node.put("title", item.getTitle());
        node.put("body", item.getBody());
        if (item.getLink() == null) {
            node.putNull("link");
        } else {
            node.put("link", item.getLink());
        }
        node.put("createdAt", item.getCreatedAt().toString());
        node.put("read", item.getReadAt() != null);
        if (item.getPayload() == null || item.getPayload().isNull()) {
            node.putNull("payload");
        } else {
            node.set("payload", item.getPayload());
        }
        return node;
    }
}
