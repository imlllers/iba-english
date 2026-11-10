package com.iba.testing.auth;

import com.iba.testing.common.exception.ApiException;
import com.iba.testing.config.AppProperties;
import com.iba.testing.config.SessionConfig;
import com.iba.testing.notification.NotificationEvents;
import com.iba.testing.security.AppUserPrincipal;
import com.iba.testing.security.CurrentUser;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class AuthService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final ApplicationEventPublisher events;
    private final LoginThrottle throttle;
    private final AppProperties properties;

    public AuthService(UserAccountRepository users, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                       ApplicationEventPublisher events, LoginThrottle throttle, AppProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.events = events;
        this.throttle = throttle;
        this.properties = properties;
    }

    @Transactional
    public UserAccount login(
            String email,
            String password,
            boolean rememberMe,
            String adminSecret,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String normalizedEmail = email.trim().toLowerCase();
        String ip = request.getRemoteAddr();
        throttle.check(normalizedEmail, ip);
        org.springframework.security.core.Authentication authentication;
        try {
            authentication = authenticate(normalizedEmail, password);
        } catch (ApiException exception) {
            if ("INVALID_CREDENTIALS".equals(exception.getCode())) {
                throttle.failed(normalizedEmail, ip);
            }
            throw exception;
        }
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        UserAccount account = users.findById(principal.getId()).orElseThrow();
        if (account.getRole() == UserRole.ADMIN && !adminSecretMatches(adminSecret)) {
            throttle.failed(normalizedEmail, ip);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Неверный email или пароль");
        }
        throttle.succeeded(normalizedEmail);
        if (account.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BLOCKED", "Учётная запись заблокирована");
        }
        if (!account.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "Подтвердите email – ссылка в письме");
        }
        if (rememberMe) {
            request.setAttribute(SessionConfig.REMEMBER_ME_ATTR, Boolean.TRUE);
        }
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        HttpSession session = request.getSession(false);
        if (session != null && rememberMe) {
            session.setMaxInactiveInterval(SessionConfig.REMEMBER_ME_SECONDS);
        }
        account.setLastLoginAt(OffsetDateTime.now());
        events.publishEvent(new NotificationEvents.LoginSucceeded(account.getId(), request.getHeader("User-Agent")));
        return account;
    }

    private boolean adminSecretMatches(String provided) {
        String expected = properties.getAdmin().getLoginSecret();
        if (expected == null || expected.isBlank()) {
            return true;
        }
        return provided != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), provided.getBytes(StandardCharsets.UTF_8));
    }

    private org.springframework.security.core.Authentication authenticate(String email, String password) {
        try {
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email.trim().toLowerCase(), password));
        } catch (DisabledException exception) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BLOCKED", "Учётная запись заблокирована");
        } catch (AuthenticationException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Неверный email или пароль");
        }
    }

    public void logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    @Transactional
    public UserAccount updateProfile(String displayName, String email) {
        if (displayName == null || displayName.isBlank() || displayName.trim().length() > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Имя должно быть от 1 до 120 символов");
        }
        UserAccount account = users.findById(CurrentUser.require().getId()).orElseThrow();
        if (email != null && account.getRole() == UserRole.ADMIN) {
            String normalized = email.trim().toLowerCase();
            if (normalized.length() > 254 || !normalized.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Укажите email в формате name@example.com");
            }
            if (!normalized.equals(account.getEmail())) {
                users.findByEmailIgnoreCase(normalized).ifPresent((other) -> {
                    throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Такой email уже есть");
                });
                account.setEmail(normalized);
            }
        }
        account.setDisplayName(displayName.trim());
        account.setUpdatedAt(OffsetDateTime.now());
        return account;
    }

    @Transactional
    public UserAccount updateAvatar(String avatar) {
        if (avatar != null && !avatar.matches("avatar_(0[1-9]|1[0-2])")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Такого аватара нет");
        }
        UserAccount account = users.findById(CurrentUser.require().getId()).orElseThrow();
        account.setAvatar(avatar);
        account.setUpdatedAt(OffsetDateTime.now());
        return account;
    }

    @Transactional
    public UserAccount changePassword(String currentPassword, String newPassword) {
        AppUserPrincipal principal = CurrentUser.require();
        UserAccount account = users.findById(principal.getId()).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, account.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Текущий пароль неверный",
                    Map.of("currentPassword", "Текущий пароль неверный"));
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Новый пароль должен быть не короче 8 символов");
        }
        account.setPasswordHash(passwordEncoder.encode(newPassword));
        account.setUpdatedAt(OffsetDateTime.now());
        events.publishEvent(new NotificationEvents.PasswordChanged(account.getId()));
        return account;
    }
}
