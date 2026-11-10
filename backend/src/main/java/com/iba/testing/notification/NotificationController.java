package com.iba.testing.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teacher/notifications")
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public Object list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return notifications.list(CurrentUser.require().getId(), page, Math.min(size, 50));
    }

    @GetMapping("/unread-count")
    public Object unread() {
        return Map.of("count", notifications.unread(CurrentUser.require().getId()));
    }

    @PostMapping("/{id}/read")
    public Object read(@PathVariable UUID id) {
        notifications.markRead(CurrentUser.require().getId(), id);
        return Map.of("ok", true);
    }

    @PostMapping("/read-all")
    public Object readAll() {
        notifications.markAllRead(CurrentUser.require().getId());
        return Map.of("ok", true);
    }

    @PostMapping("/clear")
    public Object clear() {
        notifications.clear(CurrentUser.require().getId());
        return Map.of("ok", true);
    }

    @GetMapping("/preferences")
    public Object preferences() {
        return notifications.preferences(CurrentUser.require().getId());
    }

    @PutMapping("/preferences")
    public Object savePreferences(@RequestBody JsonNode body) {
        return notifications.savePreferences(CurrentUser.require().getId(), body);
    }
}
