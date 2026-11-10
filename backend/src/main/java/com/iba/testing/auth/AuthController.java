package com.iba.testing.auth;

import com.iba.testing.auth.dto.ForgotPasswordRequest;
import com.iba.testing.auth.dto.LoginRequest;
import com.iba.testing.auth.dto.PasswordChangeRequest;
import com.iba.testing.auth.dto.RegisterRequest;
import com.iba.testing.auth.dto.ResetPasswordRequest;
import com.iba.testing.auth.dto.VerifyEmailRequest;
import com.iba.testing.invite.InviteService;
import com.iba.testing.mail.EmailVerificationService;
import com.iba.testing.mail.PasswordResetService;
import com.iba.testing.security.CurrentUser;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserAdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final InviteService invites;
    private final PasswordResetService passwordReset;
    private final EmailVerificationService emailVerification;
    private final UserAccountRepository users;
    private final UserAdminService userViews;

    public AuthController(
            AuthService auth,
            InviteService invites,
            PasswordResetService passwordReset,
            EmailVerificationService emailVerification,
            UserAccountRepository users,
            UserAdminService userViews
    ) {
        this.auth = auth;
        this.invites = invites;
        this.passwordReset = passwordReset;
        this.emailVerification = emailVerification;
        this.users = users;
        this.userViews = userViews;
    }

    @PostMapping("/login")
    public Object login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        return userViews.toNode(auth.login(
                request.email(),
                request.password(),
                request.rememberMeEnabled(),
                request.adminSecret(),
                httpRequest,
                response));
    }

    @PostMapping("/register")
    public Object register(@Valid @RequestBody RegisterRequest request) {
        invites.register(request.inviteCode(), request.email(), request.displayName(), request.password());
        return Map.of("ok", true);
    }

    @PostMapping("/verify-email")
    public Object verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerification.verify(request.token());
        return Map.of("ok", true);
    }

    @PostMapping("/resend-verification")
    public Object resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        emailVerification.resend(request.email());
        return Map.of("ok", true);
    }

    @PostMapping("/forgot-password")
    public Object forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordReset.requestReset(request.email());
        return Map.of("ok", true);
    }

    @PostMapping("/reset-password")
    public Object resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordReset.reset(request.token(), request.password());
        return Map.of("ok", true);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        auth.logout(request);
    }

    @GetMapping("/me")
    public Object me() {
        return userViews.toNode(users.findById(CurrentUser.require().getId()).orElseThrow());
    }

    @PostMapping("/password")
    public Object password(@Valid @RequestBody PasswordChangeRequest request) {
        return userViews.toNode(auth.changePassword(request.currentPassword(), request.newPassword()));
    }

    @PutMapping("/profile")
    public Object profile(@RequestBody ProfileRequest request) {
        return userViews.toNode(auth.updateProfile(request.displayName(), request.email()));
    }

    @PutMapping("/avatar")
    public Object avatar(@RequestBody AvatarRequest request) {
        return userViews.toNode(auth.updateAvatar(request.avatar()));
    }

    public record ProfileRequest(String displayName, String email) {
    }

    public record AvatarRequest(String avatar) {
    }
}
