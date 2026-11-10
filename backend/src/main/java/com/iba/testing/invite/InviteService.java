package com.iba.testing.invite;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.audit.AuditService;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.mail.EmailVerificationService;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class InviteService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;
    private static final int DEFAULT_DAYS = 7;
    private static final int MAX_DAYS = 90;

    private final InviteCodeRepository invites;
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final ObjectMapper mapper;
    private final PlatformService platform;
    private final EmailVerificationService emailVerification;
    private final SecureRandom random = new SecureRandom();

    public InviteService(
            InviteCodeRepository invites,
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            AuditService audit,
            ObjectMapper mapper,
            PlatformService platform,
            EmailVerificationService emailVerification
    ) {
        this.invites = invites;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.mapper = mapper;
        this.platform = platform;
        this.emailVerification = emailVerification;
    }

    @Transactional
    public ObjectNode create(UUID actorId, Integer validDays) {
        int days = validDays == null ? DEFAULT_DAYS : validDays;
        if (days < 1 || days > MAX_DAYS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Срок приглашения – от 1 до 90 дней");
        }
        String code = generateCode();
        OffsetDateTime now = OffsetDateTime.now();
        InviteCode invite = new InviteCode();
        invite.setId(UUID.randomUUID());
        invite.setCodeHash(hash(code));
        invite.setCode(code);
        invite.setCreatedBy(actorId);
        invite.setExpiresAt(now.plusDays(days));
        invite.setCreatedAt(now);
        invites.save(invite);
        audit.record(actorId, "INVITE_CREATED", "INVITE", invite.getId(),
                audit.details("expiresAt", invite.getExpiresAt().toString()));
        return toNode(invite, now);
    }

    @Transactional(readOnly = true)
    public List<ObjectNode> listActive() {
        OffsetDateTime now = OffsetDateTime.now();
        return invites.findActive(now).stream().map(invite -> toNode(invite, now)).toList();
    }

    @Transactional
    public void revoke(UUID actorId, UUID inviteId) {
        InviteCode invite = invites.findById(inviteId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Приглашение не найдено"));
        OffsetDateTime now = OffsetDateTime.now();
        if (!invite.isActive(now)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVITE_INACTIVE", "Приглашение уже недействительно");
        }
        invite.setRevokedAt(now);
        audit.record(actorId, "INVITE_REVOKED", "INVITE", inviteId, mapper.createObjectNode());
    }

    @Transactional
    public UserAccount register(String inviteCode, String email, String displayName, String password) {
        if (inviteCode == null || inviteCode.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Введите код приглашения");
        }
        if (password == null || password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Пароль должен быть не короче 8 символов");
        }
        if (displayName == null || displayName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите имя");
        }
        String normalized = email == null ? "" : email.trim().toLowerCase();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите email");
        }
        InviteCode invite = invites.findByCodeHash(hash(inviteCode))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITE", "Неверный или недействительный код"));
        OffsetDateTime now = OffsetDateTime.now();
        if (invite.getRevokedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITE", "Неверный или недействительный код");
        }
        if (invite.getUsedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITE", "Код уже использован");
        }
        if (!invite.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITE", "Срок действия кода истёк");
        }
        if (users.findByEmailIgnoreCase(normalized).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Такой email уже есть");
        }
        if (!platform.mailSettings().configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_NOT_CONFIGURED",
                    "Регистрация временно недоступна – не настроена почта");
        }
        UserAccount account = new UserAccount();
        account.setId(UUID.randomUUID());
        account.setEmail(normalized);
        account.setDisplayName(displayName.trim());
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(UserRole.TEACHER);
        account.setStatus(UserStatus.ACTIVE);
        account.setEmailVerified(false);
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        users.saveAndFlush(account);
        invite.setUsedAt(now);
        invite.setUsedBy(account.getId());
        invites.saveAndFlush(invite);
        audit.record(account.getId(), "USER_REGISTERED", "USER", account.getId(),
                audit.details("email", account.getEmail()).put("inviteId", invite.getId().toString()));
        emailVerification.sendFor(account);
        return account;
    }

    private ObjectNode toNode(InviteCode invite, OffsetDateTime now) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", invite.getId().toString());
        if (invite.getCode() == null) {
            node.putNull("code");
        } else {
            node.put("code", invite.getCode());
        }
        node.put("expiresAt", invite.getExpiresAt().toString());
        node.put("createdAt", invite.getCreatedAt().toString());
        node.put("active", invite.isActive(now));
        if (invite.getUsedAt() == null) {
            node.putNull("usedAt");
        } else {
            node.put("usedAt", invite.getUsedAt().toString());
        }
        if (invite.getRevokedAt() == null) {
            node.putNull("revokedAt");
        } else {
            node.put("revokedAt", invite.getRevokedAt().toString());
        }
        return node;
    }

    private String generateCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return builder.toString();
    }

    static String hash(String code) {
        try {
            String normalized = code.trim().toUpperCase().replace(" ", "").replace("-", "");
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
