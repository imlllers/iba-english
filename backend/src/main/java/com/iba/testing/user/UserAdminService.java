package com.iba.testing.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.audit.AuditService;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class UserAdminService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final ObjectMapper mapper;

    public UserAdminService(UserAccountRepository users, PasswordEncoder passwordEncoder, AuditService audit, ObjectMapper mapper) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> list(String query, UserRole role, UserStatus status, int page, int size) {
        var result = users.search(role, status, query == null ? "" : query.trim(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(result.map(this::toNode).toList(), page, size, result.getTotalElements());
    }

    @Transactional
    public ObjectNode create(UUID actorId, String email, String displayName, String password, UserRole role) {
        String normalized = email.trim().toLowerCase();
        if (users.findByEmailIgnoreCase(normalized).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Такой email уже есть");
        }
        if (password == null || password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Пароль должен быть не короче 8 символов");
        }
        if (displayName == null || displayName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите имя");
        }
        OffsetDateTime now = OffsetDateTime.now();
        UserAccount account = new UserAccount();
        account.setId(UUID.randomUUID());
        account.setEmail(normalized);
        account.setDisplayName(displayName.trim());
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(role);
        account.setStatus(UserStatus.ACTIVE);
        account.setEmailVerified(true);
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        users.save(account);
        audit.record(actorId, "USER_CREATED", "USER", account.getId(), audit.details("email", account.getEmail()).put("role", role.name()));
        return toNode(account);
    }

    @Transactional
    public ObjectNode changeStatus(UUID actorId, UUID userId, UserStatus status) {
        UserAccount account = require(userId);
        if (actorId.equals(userId) && status == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Нельзя заблокировать свою учётную запись");
        }
        account.setStatus(status);
        account.setUpdatedAt(OffsetDateTime.now());
        audit.record(actorId, status == UserStatus.BLOCKED ? "USER_BLOCKED" : "USER_UNBLOCKED", "USER", userId, audit.details("email", account.getEmail()));
        return toNode(account);
    }

    @Transactional
    public ObjectNode changeRole(UUID actorId, UUID userId, UserRole role) {
        UserAccount account = require(userId);
        if (account.getRole() == UserRole.ADMIN && role != UserRole.ADMIN && users.countByRole(UserRole.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LAST_ADMIN", "Нельзя снять роль с последнего администратора");
        }
        account.setRole(role);
        account.setUpdatedAt(OffsetDateTime.now());
        audit.record(actorId, "ROLE_CHANGED", "USER", userId, audit.details("email", account.getEmail()).put("role", role.name()));
        return toNode(account);
    }

    public ObjectNode toNode(UserAccount account) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", account.getId().toString());
        node.put("email", account.getEmail());
        node.put("displayName", account.getDisplayName());
        if (account.getAvatar() != null) {
            node.put("avatar", account.getAvatar());
        } else {
            node.putNull("avatar");
        }
        node.put("role", account.getRole().name());
        node.put("status", account.getStatus().name());
        node.put("emailVerified", account.isEmailVerified());
        node.put("createdAt", account.getCreatedAt().toString());
        if (account.getLastLoginAt() == null) {
            node.putNull("lastLoginAt");
        } else {
            node.put("lastLoginAt", account.getLastLoginAt().toString());
        }
        return node;
    }

    private UserAccount require(UUID id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Пользователь не найден"));
    }
}
