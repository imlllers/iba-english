package com.iba.testing.test;

import com.iba.testing.user.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ExamTestRepository extends JpaRepository<ExamTest, UUID> {

    Optional<ExamTest> findByPublicToken(String publicToken);

    long countByOwnerAndStatus(UserAccount owner, TestStatus status);

    long countByStatus(TestStatus status);

    java.util.List<ExamTest> findByStatus(TestStatus status);

    @Query("""
            select t from ExamTest t
            where t.owner = :owner
              and (:status is null or t.status = :status)
              and (
                :examPreset is null
                or (:examPreset = '' and t.examPreset is null)
                or t.examPreset = :examPreset
              )
              and (:query = '' or lower(t.title) like lower(concat('%', :query, '%')))
            """)
    Page<ExamTest> searchOwned(UserAccount owner, TestStatus status, String examPreset, String query, Pageable pageable);

    @Query("""
            select t from ExamTest t
            where (:status is null or t.status = :status)
              and (
                :query = ''
                or lower(t.title) like lower(concat('%', :query, '%'))
                or lower(t.owner.email) like lower(concat('%', :query, '%'))
              )
            """)
    Page<ExamTest> searchAll(TestStatus status, String query, Pageable pageable);
}
