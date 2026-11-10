package com.iba.testing.attempt;

import com.iba.testing.test.TestVersion;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TestAttemptRepository extends JpaRepository<TestAttempt, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TestAttempt a where a.accessTokenHash = :hash")
    Optional<TestAttempt> findLockedByAccessTokenHash(String hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TestAttempt a where a.id = :id")
    Optional<TestAttempt> findLockedById(UUID id);

    Optional<TestAttempt> findByAccessTokenHash(String hash);

    Page<TestAttempt> findByTestVersionIn(java.util.Collection<TestVersion> versions, Pageable pageable);

    long countByTestVersionInAndStatus(java.util.Collection<TestVersion> versions, AttemptStatus status);

    long countByTestVersion(TestVersion version);

    @Query("""
            select a from TestAttempt a
            where a.testVersion.test.owner.id = :ownerId
              and (:testId is null or a.testVersion.test.id = :testId)
              and (:status is null or a.status = :status)
              and (:level is null or a.scaleLevel = :level)
              and (
                :q is null or :q = ''
                or lower(coalesce(a.participantName, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(a.participantEmail, '')) like lower(concat('%', :q, '%'))
                or lower(a.testVersion.test.title) like lower(concat('%', :q, '%'))
              )
            """)
    Page<TestAttempt> searchForOwner(UUID ownerId, UUID testId, AttemptStatus status, String level, String q, Pageable pageable);

    long countByStatusAndTestVersionTestOwnerId(AttemptStatus status, UUID ownerId);

    @Query("""
            select a from TestAttempt a
            where a.status <> :open
              and a.submittedAt is not null
              and a.submittedAt < :cutoff
            """)
    java.util.List<TestAttempt> findFinishedBefore(AttemptStatus open, OffsetDateTime cutoff, org.springframework.data.domain.Pageable pageable);

    long countByTestVersionTestIdAndStatusNot(UUID testId, AttemptStatus status);

    long countByTestVersionTestIdAndStatus(UUID testId, AttemptStatus status);

    @Query("""
            select a.testVersion.test.owner.id, count(a) from TestAttempt a
            where a.status = :status and a.submittedAt < :cutoff
            group by a.testVersion.test.owner.id
            """)
    java.util.List<Object[]> countStaleByOwner(AttemptStatus status, OffsetDateTime cutoff);
}
