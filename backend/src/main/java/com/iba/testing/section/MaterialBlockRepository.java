package com.iba.testing.section;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialBlockRepository extends JpaRepository<MaterialBlock, UUID> {

    List<MaterialBlock> findBySectionOrderByOrderIndexAsc(TestSection section);

    long countBySection(TestSection section);
}
