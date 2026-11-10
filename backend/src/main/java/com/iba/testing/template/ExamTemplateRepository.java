package com.iba.testing.template;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamTemplateRepository extends JpaRepository<ExamTemplate, UUID> {

    List<ExamTemplate> findByOwnerIdOrderByBuiltinKeyAscTitleAsc(UUID ownerId);

    long countByOwnerId(UUID ownerId);

    Optional<ExamTemplate> findByIdAndOwnerId(UUID id, UUID ownerId);

    Optional<ExamTemplate> findByOwnerIdAndBuiltinKey(UUID ownerId, String builtinKey);
}
