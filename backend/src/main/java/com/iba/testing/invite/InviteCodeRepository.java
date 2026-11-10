package com.iba.testing.invite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InviteCodeRepository extends JpaRepository<InviteCode, UUID> {

    Optional<InviteCode> findByCodeHash(String codeHash);

    @Query("""
            select i from InviteCode i
            where i.usedAt is null and i.revokedAt is null and i.expiresAt > :now
            order by i.createdAt desc
            """)
    List<InviteCode> findActive(OffsetDateTime now);
}
