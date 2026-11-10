package com.iba.testing.attempt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnswerRepository extends JpaRepository<Answer, UUID> {

    List<Answer> findByAttempt(TestAttempt attempt);

    Optional<Answer> findByAttemptAndQuestionId(TestAttempt attempt, UUID questionId);

    boolean existsByAttemptAndNeedsReviewTrue(TestAttempt attempt);
}
