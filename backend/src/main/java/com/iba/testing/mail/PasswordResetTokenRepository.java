package com.iba.testing.mail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("delete from PasswordResetToken t where t.userId = :userId and t.usedAt is null")
    void deleteUnusedByUserId(UUID userId);
}
