package com.iba.testing.notification;

import com.iba.testing.invite.InviteCode;
import com.iba.testing.invite.InviteCodeRepository;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AdminNotificationService {

    private static final String TEACHERS_LINK = "/admin/teachers";
    private static final String INVITES_LINK = "/admin/teachers#invites";

    private final NotificationService notifications;
    private final UserAccountRepository users;
    private final InviteCodeRepository invites;

    public AdminNotificationService(NotificationService notifications, UserAccountRepository users, InviteCodeRepository invites) {
        this.notifications = notifications;
        this.users = users;
        this.invites = invites;
    }

    public void teacherRegisteredViaInvite(UserAccount teacher) {
        String body = teacher.getDisplayName() + " зарегистрировался по приглашению";
        String dedupe = "teacher-registered:" + teacher.getId();
        for (UUID adminId : adminIds()) {
            notifications.notify(adminId, NotificationType.TEACHER_REGISTERED, "Новый преподаватель", body, TEACHERS_LINK, dedupe);
        }
    }

    @Transactional
    public void processExpiredInvites() {
        OffsetDateTime now = OffsetDateTime.now();
        for (InviteCode invite : invites.findExpiredUnnotified(now)) {
            inviteExpired(invite.getId(), inviteCode(invite));
            invite.setExpiryNotifiedAt(now);
            invites.save(invite);
        }
    }

    private void inviteExpired(UUID inviteId, String code) {
        String body = "Приглашение " + code + " истекло";
        String dedupe = "invite-expired:" + inviteId;
        for (UUID adminId : adminIds()) {
            notifications.notify(adminId, NotificationType.INVITE_EXPIRED, "Приглашение истекло", body, INVITES_LINK, dedupe);
        }
    }

    private static String inviteCode(InviteCode invite) {
        if (invite.getCode() != null && !invite.getCode().isBlank()) {
            return invite.getCode();
        }
        return invite.getId().toString();
    }

    private List<UUID> adminIds() {
        return users.findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE).stream().map(UserAccount::getId).toList();
    }
}