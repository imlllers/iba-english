package com.iba.testing.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    @Query("""
            select e from AuditEvent e
            where :query = '' or lower(e.action) like lower(concat('%', :query, '%'))
            """)
    Page<AuditEvent> search(String query, Pageable pageable);
}
