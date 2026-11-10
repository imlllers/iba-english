package com.iba.testing.mail;

import com.iba.testing.audit.AuditService;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.config.AppProperties;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TTL_HOURS = 1;

    private final UserAccountRepository users;
    private final PasswordResetTokenRepository tokens;
    private final MailService mail;
    private final PlatformService platform;
    private final AppProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(
            UserAccountRepository users,
            PasswordResetTokenRepository tokens,
            MailService mail,
            PlatformService platform,
            AppProperties properties,
            PasswordEncoder passwordEncoder,
            AuditService audit
    ) {
        this.users = users;
        this.tokens = tokens;
        this.mail = mail;
        this.platform = platform;
        this.properties = properties;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Transactional
    public void requestReset(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        var account = users.findByEmailIgnoreCase(normalized).orElse(null);
        if (account == null || account.getStatus() != UserStatus.ACTIVE || !account.isEmailVerified()) {
            return;
        }
        if (!platform.mailSettings().configured()) {
            log.warn("Password reset requested but mail is not configured");
            return;
        }
        tokens.deleteUnusedByUserId(account.getId());
        String raw = generateToken();
        OffsetDateTime now = OffsetDateTime.now();
        PasswordResetToken token = new PasswordResetToken();
        token.setId(UUID.randomUUID());
        token.setUserId(account.getId());
        token.setTokenHash(hash(raw));
        token.setExpiresAt(now.plusHours(TTL_HOURS));
        token.setCreatedAt(now);
        tokens.save(token);
        String link = properties.getFrontendOrigin().replaceAll("/$", "") + "/reset-password?token=" + raw;
        String body = """
                Здравствуйте, %s!

                Чтобы задать новый пароль в IBA English, перейдите по ссылке (действует 1 час):
                %s

                Если вы не запрашивали сброс, просто проигнорируйте это письмо.
                """.formatted(account.getDisplayName(), link);
        try {
            mail.send(account.getEmail(), "Сброс пароля – IBA English", body);
            audit.record(account.getId(), "PASSWORD_RESET_REQUESTED", "USER", account.getId());
        } catch (ApiException exception) {
            log.warn("Failed to send password reset mail to {}: {}", account.getEmail(), exception.getMessage());
        }
    }

    @Transactional
    public void reset(String rawToken, String password) {
        if (password == null || password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Пароль должен быть не короче 8 символов");
        }
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела");
        }
        PasswordResetToken token = tokens.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела"));
        OffsetDateTime now = OffsetDateTime.now();
        if (token.getUsedAt() != null || !token.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела");
        }
        UserAccount account = users.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела"));
        if (account.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BLOCKED", "Учётная запись заблокирована");
        }
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setUpdatedAt(now);
        token.setUsedAt(now);
        tokens.saveAndFlush(token);
        tokens.deleteUnusedByUserId(account.getId());
        audit.record(account.getId(), "PASSWORD_RESET", "USER", account.getId());
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
