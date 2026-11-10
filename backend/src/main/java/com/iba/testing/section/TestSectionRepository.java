package com.iba.testing.section;

import com.iba.testing.test.ExamTest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TestSectionRepository extends JpaRepository<TestSection, UUID> {

    List<TestSection> findByTestOrderByOrderIndexAsc(ExamTest test);

    long countByTest(ExamTest test);
}
