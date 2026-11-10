package com.iba.testing.config;

import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class AdminInitializer implements ApplicationRunner {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    public AdminInitializer(UserAccountRepository users, PasswordEncoder passwordEncoder, AppProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(UserRole.ADMIN)) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        UserAccount admin = new UserAccount();
        admin.setId(UUID.randomUUID());
        admin.setEmail(properties.getAdmin().getEmail().trim().toLowerCase());
        admin.setPasswordHash(passwordEncoder.encode(properties.getAdmin().getPassword()));
        admin.setDisplayName(properties.getAdmin().getDisplayName());
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setEmailVerified(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        users.save(admin);
    }
}
