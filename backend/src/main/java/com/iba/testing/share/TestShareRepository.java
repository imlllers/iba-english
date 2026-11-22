package com.iba.testing.share;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TestShareRepository extends JpaRepository<TestShare, UUID> {

    Optional<TestShare> findByIdAndRecipientId(UUID id, UUID recipientId);

    Optional<TestShare> findByIdAndSenderId(UUID id, UUID senderId);
}