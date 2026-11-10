package com.iba.testing.notification;

import java.util.UUID;

public final class NotificationEvents {

    private NotificationEvents() {
    }

    public record AttemptNeedsReview(UUID ownerId, UUID attemptId, String testTitle, String participantName) {
    }

    public record PasswordChanged(UUID userId) {
    }

    public record LoginSucceeded(UUID userId, String userAgent) {
    }
}
