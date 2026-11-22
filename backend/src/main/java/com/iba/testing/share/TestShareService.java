package com.iba.testing.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.common.response.PageResponse;
import com.iba.testing.media.MediaService;
import com.iba.testing.notification.NotificationService;
import com.iba.testing.notification.NotificationType;
import com.iba.testing.share.dto.ShareTestRequest;
import com.iba.testing.test.ExamAccess;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestRepository;
import com.iba.testing.test.TestCopyService;
import com.iba.testing.test.TestStatus;
import com.iba.testing.test.TestViews;
import com.iba.testing.user.UserAccount;
import com.iba.testing.user.UserAccountRepository;
import com.iba.testing.user.UserRole;
import com.iba.testing.user.UserStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TestShareService {

    private final ExamTestRepository tests;
    private final TestShareRepository shares;
    private final UserAccountRepository users;
    private final ExamAccess access;
    private final TestCopyService copies;
    private final TestViews views;
    private final NotificationService notifications;
    private final MediaService media;
    private final ObjectMapper mapper;

    public TestShareService(ExamTestRepository tests, TestShareRepository shares, UserAccountRepository users,
                            ExamAccess access, TestCopyService copies, TestViews views, NotificationService notifications,
                            MediaService media, ObjectMapper mapper) {
        this.tests = tests;
        this.shares = shares;
        this.users = users;
        this.access = access;
        this.copies = copies;
        this.views = views;
        this.notifications = notifications;
        this.media = media;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectNode> colleagues(UUID userId, String query, int page, int size) {
        String q = query == null ? "" : query.trim();
        var result = users.searchColleagues(UserRole.TEACHER, UserStatus.ACTIVE, userId, q,
                PageRequest.of(page, Math.min(size, 50), Sort.by("displayName")));
        return new PageResponse<>(result.map(this::colleagueNode).toList(), page, size, result.getTotalElements());
    }

    @Transactional
    public ObjectNode share(UUID senderId, UUID testId, ShareTestRequest request) {
        ExamTest source = access.requireOwned(testId, senderId);
        UserAccount sender = access.requireUser(senderId);
        Set<UUID> recipientIds = normalizeRecipients(senderId, request.recipientIds());
        if (recipientIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Выберите получателей");
        }
        String comment = request.comment() == null ? "" : request.comment().trim();
        if (comment.length() > 2000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Комментарий слишком длинный");
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (UUID recipientId : recipientIds) {
            UserAccount recipient = users.findById(recipientId)
                    .filter(user -> user.getRole() == UserRole.TEACHER && user.getStatus() == UserStatus.ACTIVE)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Получатель недоступен"));
            ExamTest snapshot = copies.copy(source, sender, TestCopyService.CopyOptions.shareSnapshot());
            TestShare share = new TestShare();
            share.setId(UUID.randomUUID());
            share.setSourceTest(source);
            share.setSnapshotTest(snapshot);
            share.setSender(sender);
            share.setRecipient(recipient);
            share.setComment(comment);
            share.setStatus(TestShareStatus.PENDING);
            share.setCreatedAt(now);
            shares.save(share);
            ObjectNode payload = sharePayload(share, sender, source, comment);
            String body = buildShareBody(sender.getDisplayName(), source.getTitle(), comment);
            notifications.notifyWithPayload(recipient.getId(), NotificationType.TEST_SHARED,
                    "Тест от коллеги", body, null, "test-share:" + share.getId(), payload);
        }
        ObjectNode result = mapper.createObjectNode();
        result.put("ok", true);
        return result;
    }

    @Transactional(readOnly = true)
    public ObjectNode preview(UUID recipientId, UUID shareId) {
        TestShare share = requirePending(recipientId, shareId);
        ExamTest snapshot = share.getSnapshotTest();
        return views.publicView(views.snapshot(snapshot), snapshot.getSettings());
    }

    @Transactional(readOnly = true)
    public MediaService.StoredFile snapshotMedia(UUID recipientId, UUID shareId, UUID mediaId) {
        TestShare share = requirePending(recipientId, shareId);
        if (!copies.collectMediaIds(share.getSnapshotTest()).contains(mediaId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Файл не найден");
        }
        return media.teacherFile(share.getSnapshotTest().getOwner().getId(), mediaId);
    }

    @Transactional
    public ObjectNode accept(UUID recipientId, UUID shareId) {
        TestShare share = requirePending(recipientId, shareId);
        UserAccount recipient = share.getRecipient();
        UserAccount sender = share.getSender();
        ExamTest snapshot = share.getSnapshotTest();
        Set<UUID> clonedMedia = copies.collectMediaIds(snapshot);
        copies.transferMediaOwner(clonedMedia, sender, recipient);
        snapshot.setOwner(recipient);
        snapshot.setListed(true);
        snapshot.setSharedFromName(sender.getDisplayName());
        snapshot.setStatus(TestStatus.DRAFT);
        snapshot.setPublicToken(null);
        snapshot.setPublicTokenExpiresAt(null);
        snapshot.setUpdatedAt(OffsetDateTime.now());
        tests.save(snapshot);
        share.setStatus(TestShareStatus.ACCEPTED);
        share.setRespondedAt(OffsetDateTime.now());
        shares.save(share);
        notifications.resolveShare(recipientId, "test-share:" + shareId, "ACCEPTED");
        String title = "Тест принят";
        String body = recipient.getDisplayName() + " принял(а) тест «" + snapshot.getTitle() + "»";
        ObjectNode payload = mapper.createObjectNode();
        payload.put("recipientName", recipient.getDisplayName());
        payload.put("testTitle", snapshot.getTitle());
        notifications.notifyWithPayload(sender.getId(), NotificationType.TEST_SHARE_ACCEPTED, title, body, null, null, payload);
        ObjectNode result = mapper.createObjectNode();
        result.put("testId", snapshot.getId().toString());
        return result;
    }

    @Transactional
    public ObjectNode decline(UUID recipientId, UUID shareId) {
        TestShare share = requirePending(recipientId, shareId);
        UserAccount sender = share.getSender();
        ExamTest snapshot = share.getSnapshotTest();
        String testTitle = snapshot.getTitle();
        copies.deleteClonedMedia(copies.collectMediaIds(snapshot));
        share.setSnapshotTest(null);
        share.setStatus(TestShareStatus.DECLINED);
        share.setRespondedAt(OffsetDateTime.now());
        shares.save(share);
        tests.delete(snapshot);
        notifications.resolveShare(recipientId, "test-share:" + shareId, "DECLINED");
        String body = share.getRecipient().getDisplayName() + " отклонил(а) тест «" + testTitle + "»";
        ObjectNode payload = mapper.createObjectNode();
        payload.put("recipientName", share.getRecipient().getDisplayName());
        payload.put("testTitle", testTitle);
        notifications.notifyWithPayload(sender.getId(), NotificationType.TEST_SHARE_DECLINED,
                "Тест отклонён", body, null, null, payload);
        ObjectNode result = mapper.createObjectNode();
        result.put("ok", true);
        return result;
    }

    private TestShare requirePending(UUID recipientId, UUID shareId) {
        TestShare share = shares.findByIdAndRecipientId(shareId, recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Предложение не найдено"));
        if (share.getStatus() != TestShareStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_RESPONDED", "Ответ уже отправлен");
        }
        return share;
    }

    private Set<UUID> normalizeRecipients(UUID senderId, List<UUID> recipientIds) {
        if (recipientIds == null || recipientIds.isEmpty()) {
            return Set.of();
        }
        Set<UUID> ids = new LinkedHashSet<>();
        for (UUID id : recipientIds) {
            if (id != null && !id.equals(senderId)) {
                ids.add(id);
            }
        }
        return ids;
    }

    private ObjectNode colleagueNode(UserAccount user) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", user.getId().toString());
        node.put("displayName", user.getDisplayName());
        if (user.getAvatar() == null) {
            node.putNull("avatar");
        } else {
            node.put("avatar", user.getAvatar());
        }
        return node;
    }

    private ObjectNode sharePayload(TestShare share, UserAccount sender, ExamTest source, String comment) {
        ObjectNode node = mapper.createObjectNode();
        node.put("shareId", share.getId().toString());
        node.put("senderName", sender.getDisplayName());
        node.put("testTitle", source.getTitle());
        node.put("examPreset", source.getExamPreset() == null ? "" : source.getExamPreset());
        node.put("comment", comment);
        return node;
    }

    private String buildShareBody(String senderName, String testTitle, String comment) {
        StringBuilder body = new StringBuilder();
        body.append(senderName).append(" отправил(а) тест «").append(testTitle).append("»");
        if (!comment.isBlank()) {
            body.append("\n").append(comment);
        }
        return body.toString();
    }
}