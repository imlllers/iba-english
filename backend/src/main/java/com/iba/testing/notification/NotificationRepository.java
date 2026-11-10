package com.iba.testing.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserIdAndHiddenFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndHiddenFalseAndReadAtIsNull(UUID userId);

    boolean existsByUserIdAndDedupeKey(UUID userId, String dedupeKey);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.userId = :userId and n.readAt is null")
    int markAllRead(UUID userId, OffsetDateTime now);

    @Modifying
    @Query("update Notification n set n.hidden = true, n.readAt = coalesce(n.readAt, :now) where n.userId = :userId and n.hidden = false")
    int hideAll(UUID userId, OffsetDateTime now);
}
