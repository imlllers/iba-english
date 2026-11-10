package com.iba.testing.question;

import com.iba.testing.section.TestSection;
import com.iba.testing.test.ExamTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findBySectionOrderByOrderIndexAsc(TestSection section);

    long countBySectionTest(ExamTest test);

    @Query("select count(q) from Question q where q.section.test.id = :testId")
    long countByTestId(UUID testId);
}
