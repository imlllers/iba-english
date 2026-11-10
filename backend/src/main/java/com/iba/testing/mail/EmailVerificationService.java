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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final int TTL_HOURS = 24;

    private final UserAccountRepository users;
    private final EmailVerificationTokenRepository tokens;
    private final MailService mail;
    private final PlatformService platform;
    private final AppProperties properties;
    private final AuditService audit;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(
            UserAccountRepository users,
            EmailVerificationTokenRepository tokens,
            MailService mail,
            PlatformService platform,
            AppProperties properties,
            AuditService audit
    ) {
        this.users = users;
        this.tokens = tokens;
        this.mail = mail;
        this.platform = platform;
        this.properties = properties;
        this.audit = audit;
    }

    @Transactional
    public void sendFor(UserAccount account) {
        if (account.isEmailVerified()) {
            return;
        }
        if (!platform.mailSettings().configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_NOT_CONFIGURED", "Почта не настроена");
        }
        tokens.deleteUnusedByUserId(account.getId());
        String raw = generateToken();
        OffsetDateTime now = OffsetDateTime.now();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setId(UUID.randomUUID());
        token.setUserId(account.getId());
        token.setTokenHash(hash(raw));
        token.setExpiresAt(now.plusHours(TTL_HOURS));
        token.setCreatedAt(now);
        tokens.save(token);
        String link = properties.getFrontendOrigin().replaceAll("/$", "") + "/verify-email?token=" + raw;
        String body = """
                Здравствуйте, %s!

                Подтвердите email для входа в IBA English (ссылка действует 24 часа):
                %s

                Если вы не регистрировались, просто проигнорируйте это письмо.
                """.formatted(account.getDisplayName(), link);
        mail.send(account.getEmail(), "Подтвердите email – IBA English", body);
        audit.record(account.getId(), "EMAIL_VERIFICATION_SENT", "USER", account.getId());
    }

    @Transactional
    public void resend(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        var account = users.findByEmailIgnoreCase(normalized).orElse(null);
        if (account == null || account.getStatus() != UserStatus.ACTIVE || account.isEmailVerified()) {
            return;
        }
        try {
            sendFor(account);
        } catch (ApiException exception) {
            log.warn("Resend verification failed for {}: {}", normalized, exception.getMessage());
        }
    }

    @Transactional
    public void verify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела");
        }
        EmailVerificationToken token = tokens.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела"));
        OffsetDateTime now = OffsetDateTime.now();
        if (token.getUsedAt() != null || !token.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела");
        }
        UserAccount account = users.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Ссылка недействительна или устарела"));
        account.setEmailVerified(true);
        account.setUpdatedAt(now);
        token.setUsedAt(now);
        tokens.saveAndFlush(token);
        tokens.deleteUnusedByUserId(account.getId());
        audit.record(account.getId(), "EMAIL_VERIFIED", "USER", account.getId());
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
