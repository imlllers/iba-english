package com.iba.testing.admin;

import com.iba.testing.invite.InviteService;
import com.iba.testing.platform.PlatformService;
import com.iba.testing.security.CurrentUser;
import com.iba.testing.user.UserAdminService;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserAdminService users;
    private final InviteService invites;
    private final PlatformService platform;
    private final AdminCatalogService catalog;

    public AdminController(
            UserAdminService users,
            InviteService invites,
            PlatformService platform,
            AdminCatalogService catalog
    ) {
        this.users = users;
        this.invites = invites;
        this.platform = platform;
        this.catalog = catalog;
    }

    @GetMapping("/users")
    public Object users(@RequestParam(defaultValue = "") String q,
                        @RequestParam(required = false) UserRole role,
                        @RequestParam(required = false) UserStatus status,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
        return users.list(q, role, status, Math.max(page, 0), bounded(size));
    }

    @PostMapping("/users")
    public Object createUser(@Valid @RequestBody CreateUserRequest request) {
        return users.create(CurrentUser.require().getId(), request.email(), request.displayName(), request.password(), request.role());
    }

    @PatchMapping("/users/{id}/status")
    public Object status(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return users.changeStatus(CurrentUser.require().getId(), id, request.status());
    }

    @PatchMapping("/users/{id}/role")
    public Object role(@PathVariable UUID id, @Valid @RequestBody RoleRequest request) {
        return users.changeRole(CurrentUser.require().getId(), id, request.role());
    }

    @GetMapping("/invites")
    public Object invites() {
        return invites.listActive();
    }

    @PostMapping("/invites")
    public Object createInvite(@Valid @RequestBody(required = false) CreateInviteRequest request) {
        Integer days = request == null ? null : request.validDays();
        return invites.create(CurrentUser.require().getId(), days);
    }

    @PostMapping("/invites/{id}/revoke")
    public void revokeInvite(@PathVariable UUID id) {
        invites.revoke(CurrentUser.require().getId(), id);
    }

    @GetMapping("/tests")
    public Object tests(@RequestParam(defaultValue = "") String q,
                        @RequestParam(required = false) String status,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
        return catalog.tests(q, status, Math.max(page, 0), bounded(size));
    }

    @DeleteMapping("/tests/{id}")
    public void deleteTest(@PathVariable UUID id) {
        catalog.delete(CurrentUser.require().getId(), id);
    }

    @GetMapping("/audit")
    public Object audit(@RequestParam(defaultValue = "") String q,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "30") int size) {
        return catalog.audit(q, Math.max(page, 0), bounded(size));
    }

    @GetMapping("/settings")
    public Object settings() {
        return platform.current();
    }

    @PutMapping("/settings")
    public Object updateSettings(@Valid @RequestBody SettingsRequest request) {
        return platform.update(CurrentUser.require().getId(), request.maxUploadBytes(), request.uploadLimits(), request.attemptRetentionDays(), request.linkLifetimeHours());
    }

    private int bounded(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    public record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotNull UserRole role
    ) {
    }

    public record StatusRequest(@NotNull UserStatus status) {
    }

    public record RoleRequest(@NotNull UserRole role) {
    }

    public record SettingsRequest(Long maxUploadBytes, Map<String, Long> uploadLimits, @NotNull Integer attemptRetentionDays, @NotNull Integer linkLifetimeHours) {
    }

    public record CreateInviteRequest(@Min(1) @Max(90) Integer validDays) {
    }
}
