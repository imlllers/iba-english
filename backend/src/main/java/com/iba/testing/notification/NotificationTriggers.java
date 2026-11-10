package com.iba.testing.notification;

import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.ResultMailer;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.common.Tokens;
import com.iba.testing.test.AccessDates;
import com.iba.testing.test.ExamTest;
import com.iba.testing.test.ExamTestRepository;
import com.iba.testing.test.TestStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.UUID;

@Component
public class NotificationTriggers {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d MMMM, HH:mm", Locale.forLanguageTag("ru"));
    private static final ZoneId ZONE = ZoneId.of("Europe/Moscow");

    private final NotificationService notifications;
    private final ExamTestRepository tests;
    private final TestAttemptRepository attempts;
    private final JdbcTemplate jdbc;

    public NotificationTriggers(NotificationService notifications, ExamTestRepository tests, TestAttemptRepository attempts, JdbcTemplate jdbc) {
        this.notifications = notifications;
        this.tests = tests;
        this.attempts = attempts;
        this.jdbc = jdbc;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNeedsReview(NotificationEvents.AttemptNeedsReview event) {
        String who = event.participantName() == null || event.participantName().isBlank() ? "Участник" : event.participantName();
        notifications.notify(event.ownerId(), NotificationType.REVIEW_NEEDED,
                "Попытка ждёт проверки",
                who + " сдал тест «" + event.testTitle() + "». Часть ответов нужно проверить вручную",
                "/teacher/results/" + event.attemptId(), null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onResultEmailFailed(ResultMailer.ResultEmailFailed event) {
        notifications.notify(event.ownerId(), NotificationType.RESULT_EMAIL_FAILED,
                "Письмо с результатом не доставлено",
                "Не удалось отправить результат теста «" + event.testTitle() + "» на " + event.email() + ". Проверьте настройки почты или адрес участника",
                "/teacher/results/" + event.attemptId(), "mail-failed:" + event.attemptId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPasswordChanged(NotificationEvents.PasswordChanged event) {
        notifications.notify(event.userId(), NotificationType.PASSWORD_CHANGED,
                "Пароль изменён",
                "Пароль от вашей учётной записи изменён. Если это были не вы – сразу смените пароль и сообщите администратору",
                "/teacher/settings", null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onLogin(NotificationEvents.LoginSucceeded event) {
        String fingerprint = Tokens.sha256(event.userAgent() == null ? "" : event.userAgent());
        Integer known = jdbc.queryForObject("select count(*) from known_devices where user_id = ?", Integer.class, event.userId());
        int inserted = jdbc.update(
                "insert into known_devices (user_id, fingerprint, created_at) values (?, ?, now()) on conflict do nothing",
                event.userId(), fingerprint);
        if (inserted > 0 && known != null && known > 0) {
            notifications.notify(event.userId(), NotificationType.NEW_DEVICE_LOGIN,
                    "Вход с нового устройства",
                    "Выполнен вход в вашу учётную запись с нового браузера или устройства. Если это были не вы – смените пароль",
                    "/teacher/settings", null);
        }
    }

    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void checkTestDates() {
        if (!AccessDates.ENABLED) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (ExamTest test : tests.findByStatus(TestStatus.PUBLISHED)) {
            UUID owner = test.getOwner().getId();
            String link = "/teacher/tests/" + test.getId() + "/settings";
            OffsetDateTime from = moment(test.getSettings().path("availableFrom").asText(""));
            OffsetDateTime until = moment(test.getSettings().path("availableUntil").asText(""));
            if (from != null && !from.isAfter(now) && from.isAfter(now.minusDays(1))) {
                notifications.notify(owner, NotificationType.TEST_OPENED,
                        "Тест «" + test.getTitle() + "» открылся",
                        "Участники уже могут проходить тест по ссылке" + (until == null ? "" : ". Доступ до " + WHEN.format(until.atZoneSameInstant(ZONE))),
                        link, "opened:" + test.getId() + ":" + from);
            }
            if (until != null && until.isAfter(now) && !until.isAfter(now.plusHours(24))) {
                notifications.notify(owner, NotificationType.TEST_CLOSING,
                        "Тест «" + test.getTitle() + "» скоро закроется",
                        "Доступ к тесту закроется " + WHEN.format(until.atZoneSameInstant(ZONE)),
                        link, "closing:" + test.getId() + ":" + until);
            }
            if (until != null && !until.isAfter(now) && until.isAfter(now.minusDays(7))) {
                long finished = attempts.countByTestVersionTestIdAndStatusNot(test.getId(), AttemptStatus.IN_PROGRESS);
                long pending = attempts.countByTestVersionTestIdAndStatus(test.getId(), AttemptStatus.NEEDS_REVIEW);
                notifications.notify(owner, NotificationType.TEST_CLOSED,
                        "Тест «" + test.getTitle() + "» закрылся",
                        "Сдали тест: " + finished + (pending > 0 ? ". Ждут проверки: " + pending : ""),
                        "/teacher/results?testId=" + test.getId(), "closed:" + test.getId() + ":" + until);
            }
        }
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "Europe/Moscow")
    public void remindStaleReviews() {
        String day = LocalDate.now(ZONE).toString();
        for (Object[] row : attempts.countStaleByOwner(AttemptStatus.NEEDS_REVIEW, OffsetDateTime.now().minusDays(3))) {
            UUID owner = (UUID) row[0];
            long count = (Long) row[1];
            notifications.notify(owner, NotificationType.STALE_REVIEW,
                    "Попытки ждут проверки больше 3 дней",
                    "Не проверено попыток: " + count,
                    "/teacher/results?status=NEEDS_REVIEW", "stale:" + day);
        }
    }

    private static OffsetDateTime moment(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
