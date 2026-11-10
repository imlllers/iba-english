package com.iba.testing.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserAccount u where u.id = :id")
    Optional<UserAccount> findLockedById(UUID id);

    boolean existsByRole(UserRole role);

    long countByRole(UserRole role);

    long countByStatus(UserStatus status);

    @Query("""
            select u from UserAccount u
            where (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
              and (
                :query = ''
                or lower(u.email) like lower(concat('%', :query, '%'))
                or lower(u.displayName) like lower(concat('%', :query, '%'))
              )
            """)
    Page<UserAccount> search(UserRole role, UserStatus status, String query, Pageable pageable);
}
