package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.mail.MailService;
import com.iba.testing.question.engine.QuestionEngines;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class ResultMailer {

    private static final Logger log = LoggerFactory.getLogger(ResultMailer.class);

    public record ResultEmailFailed(UUID ownerId, UUID attemptId, String testTitle, String email) {
    }

    public record ResultMailRequested(UUID attemptId) {
    }

    private record Letter(UUID ownerId, String email, String title, String text, String html) {
    }

    private final MailService mail;
    private final ApplicationEventPublisher events;
    private final TestAttemptRepository attempts;
    private final TransactionTemplate tx;

    public ResultMailer(MailService mail, ApplicationEventPublisher events, TestAttemptRepository attempts, PlatformTransactionManager transactions) {
        this.mail = mail;
        this.events = events;
        this.attempts = attempts;
        this.tx = new TransactionTemplate(transactions);
    }

    public void sendIfReady(TestAttempt attempt) {
        if (ready(attempt)) {
            events.publishEvent(new ResultMailRequested(attempt.getId()));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRequested(ResultMailRequested event) {
        Letter letter = tx.execute(status -> claim(event.attemptId()));
        if (letter == null) {
            return;
        }
        try {
            deliver(letter);
        } catch (RuntimeException failure) {
            log.warn("Result mail failed for attempt {}: {}", event.attemptId(), failure.getMessage());
            tx.executeWithoutResult(status -> attempts.findById(event.attemptId()).ifPresent(attempt -> attempt.setResultEmailedAt(null)));
            events.publishEvent(new ResultEmailFailed(letter.ownerId(), event.attemptId(), letter.title(), letter.email()));
        }
    }

    private Letter claim(UUID attemptId) {
        TestAttempt attempt = attempts.findLockedById(attemptId).orElse(null);
        if (attempt == null || !ready(attempt)) {
            return null;
        }
        attempt.setResultEmailedAt(OffsetDateTime.now());
        return letter(attempt);
    }

    public void sendNow(UUID ownerId, UUID attemptId) {
        Letter letter = tx.execute(status -> {
            TestAttempt attempt = attempts.findLockedById(attemptId)
                    .filter(found -> found.getTestVersion().getTest().getOwner().getId().equals(ownerId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Попытка не найдена"));
            if (attempt.getParticipantEmail() == null || attempt.getParticipantEmail().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "NO_EMAIL", "Участник не указал email");
            }
            if (!finalResult(attempt)) {
                throw new ApiException(HttpStatus.CONFLICT, "RESULT_NOT_READY", "Сначала проверьте все задания");
            }
            attempt.setResultEmailedAt(OffsetDateTime.now());
            return letter(attempt);
        });
        try {
            deliver(letter);
        } catch (RuntimeException failure) {
            tx.executeWithoutResult(status -> attempts.findById(attemptId).ifPresent(attempt -> attempt.setResultEmailedAt(null)));
            throw failure;
        }
    }

    private void deliver(Letter letter) {
        mail.sendHtml(letter.email(), "Результат теста «" + letter.title() + "»", letter.text(), letter.html());
    }

    private static Letter letter(TestAttempt attempt) {
        String title = attempt.getTestVersion().getTest().getTitle();
        List<String[]> rows = rows(attempt, attempt.getTestVersion().getSettingsSnapshot());
        String name = attempt.getParticipantName();
        String greeting = name == null || name.isBlank() ? "Здравствуйте!" : "Здравствуйте, " + name.trim() + "!";
        return new Letter(attempt.getTestVersion().getTest().getOwner().getId(), attempt.getParticipantEmail(), title,
                text(greeting, title, rows), html(greeting, title, rows));
    }

    private static boolean ready(TestAttempt attempt) {
        JsonNode settings = attempt.getTestVersion().getSettingsSnapshot();
        String email = attempt.getParticipantEmail();
        return settings.path("emailResultToParticipant").asBoolean(false) && email != null && !email.isBlank()
                && finalResult(attempt) && attempt.getResultEmailedAt() == null;
    }

    public static boolean finalResult(TestAttempt attempt) {
        boolean finalScore = attempt.getStatus() == AttemptStatus.AUTO_GRADED || attempt.getStatus() == AttemptStatus.REVIEWED;
        JsonNode scale = attempt.getScaleResult();
        return finalScore && (scale == null || scale.isNull() || scale.path("complete").asBoolean(false));
    }

    private static List<String[]> rows(TestAttempt attempt, JsonNode settings) {
        List<String[]> rows = new ArrayList<>();
        JsonNode scale = attempt.getScaleResult();
        boolean hasScale = scale != null && !scale.isNull() && scale.path("total").isNumber();
        boolean official = QuestionEngines.officialExam(settings.path("examType").asText(""));
        boolean showScale = hasScale && (official || settings.path("showLevelToParticipant").asBoolean(true));
        if (!(official && showScale)) {
            rows.add(new String[] {"Баллы", plain(attempt.getScore()) + " из " + plain(attempt.getMaxScore())});
        }
        if (showScale) {
            for (JsonNode section : scale.path("sections")) {
                if (section.path("score").isNumber()) {
                    rows.add(new String[] {section.path("name").asText(), number(section.path("score").asDouble())});
                }
            }
            String total = number(scale.path("total").asDouble());
            if (scale.path("level").isTextual()) {
                total += " (" + scale.path("level").asText() + ")";
            }
            rows.add(new String[] {"Итог " + scale.path("title").asText(""), total});
        }
        return rows;
    }

    private static String text(String greeting, String title, List<String[]> rows) {
        StringBuilder text = new StringBuilder();
        text.append(greeting).append("\n\n");
        text.append("Результат теста «").append(title).append("»\n\n");
        for (String[] row : rows) {
            text.append(row[0].trim()).append(": ").append(row[1]).append('\n');
        }
        text.append("\nПисьмо отправлено автоматически, отвечать на него не нужно\n");
        return text.toString();
    }

    private static String html(String greeting, String title, List<String[]> rows) {
        StringBuilder table = new StringBuilder();
        for (int at = 0; at < rows.size(); at++) {
            boolean last = at == rows.size() - 1 && rows.size() > 1;
            String weight = last ? "700" : "500";
            String border = at == 0 ? "" : "border-top:1px solid #e6e9ef;";
            table.append("<tr>")
                    .append("<td style=\"padding:10px 0;").append(border).append("font-weight:").append(weight).append(";\">")
                    .append(escape(rows.get(at)[0].trim())).append("</td>")
                    .append("<td align=\"right\" style=\"padding:10px 0;").append(border).append("font-weight:").append(weight).append(";\">")
                    .append(escape(rows.get(at)[1])).append("</td>")
                    .append("</tr>");
        }
        return "<!DOCTYPE html><html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"></head><body style=\"margin:0;padding:0;background:#f3f5f9;\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f5f9;padding:24px 12px;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;"
                + "font-family:Montserrat,Arial,sans-serif;color:#1c1d1e;font-size:15px;line-height:22px;\">"
                + "<tr><td style=\"background:#164aa1;padding:15px 24px;\"><img src=\"cid:logo\" alt=\"IBA Institute\" height=\"34\" style=\"display:block;height:34px;border:0;\"></td></tr>"
                + "<tr><td style=\"padding:24px;\">"
                + "<p style=\"margin:0 0 8px;\">" + escape(greeting) + "</p>"
                + "<p style=\"margin:0 0 16px;font-size:20px;line-height:30px;font-weight:700;\">Результат теста «" + escape(title) + "»</p>"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" + table + "</table>"
                + "</td></tr>"
                + "<tr><td style=\"padding:12px 24px;background:#f7f8fb;color:#868e96;font-size:13px;line-height:20px;\">"
                + "Письмо отправлено автоматически, отвечать на него не нужно</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String plain(BigDecimal value) {
        return value == null ? "–" : value.stripTrailingZeros().toPlainString();
    }

    private static String number(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }
}
