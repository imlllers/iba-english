package com.iba.testing.section;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SectionPartRepository extends JpaRepository<SectionPart, UUID> {

    List<SectionPart> findBySectionOrderByOrderIndexAsc(TestSection section);

    long countBySection(TestSection section);
}
