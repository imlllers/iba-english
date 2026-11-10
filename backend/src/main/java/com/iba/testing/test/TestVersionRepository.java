package com.iba.testing.test;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestVersionRepository extends JpaRepository<TestVersion, UUID> {

    Optional<TestVersion> findFirstByTestOrderByVersionNumberDesc(ExamTest test);

    List<TestVersion> findByTest(ExamTest test);
}
