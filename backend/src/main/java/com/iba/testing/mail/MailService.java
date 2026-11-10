package com.iba.testing.mail;

import com.iba.testing.common.exception.ApiException;
import com.iba.testing.platform.PlatformService;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.activation.DataHandler;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final PlatformService platform;
    private final CopyOnWriteArrayList<SentMail> outbox = new CopyOnWriteArrayList<>();
    private volatile boolean captureOnly;

    public MailService(PlatformService platform) {
        this.platform = platform;
    }

    public void setCaptureOnly(boolean captureOnly) {
        this.captureOnly = captureOnly;
    }

    public List<SentMail> drainOutbox() {
        List<SentMail> copy = new ArrayList<>(outbox);
        outbox.clear();
        return copy;
    }

    public void send(String to, String subject, String text) {
        sendHtml(to, subject, text, null);
    }

    public void sendHtml(String to, String subject, String text, String html) {
        MailSettings settings = platform.mailSettings();
        if (!settings.configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_NOT_CONFIGURED", "Почта не настроена");
        }
        SentMail mail = new SentMail(to, subject, text, html);
        outbox.add(mail);
        if (captureOnly) {
            return;
        }
        try {
            deliver(settings, mail);
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Mail send failed to {}: {}", to, exception.toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MAIL_SEND_FAILED", "Не удалось отправить письмо");
        }
    }

    private void deliver(MailSettings settings, SentMail mail) throws Exception {
        Properties props = new Properties();
        props.put("mail.smtp.host", settings.host());
        props.put("mail.smtp.port", String.valueOf(settings.port()));
        props.put("mail.smtp.auth", "true");
        if (settings.startTls()) {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(settings.username(), settings.password());
            }
        });
        MimeMessage message = new MimeMessage(session);
        String fromName = settings.fromName() == null || settings.fromName().isBlank() ? "IBA English" : settings.fromName();
        message.setFrom(new InternetAddress(settings.fromEmail(), fromName, StandardCharsets.UTF_8.name()));
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(mail.to()));
        message.setSubject(mail.subject(), StandardCharsets.UTF_8.name());
        if (mail.html() == null) {
            message.setText(mail.text(), StandardCharsets.UTF_8.name());
        } else {
            message.setContent(htmlContent(mail));
        }
        Transport.send(message);
    }

    private static MimeMultipart htmlContent(SentMail mail) throws Exception {
        MimeMultipart alternative = new MimeMultipart("alternative");
        MimeBodyPart text = new MimeBodyPart();
        text.setText(mail.text(), StandardCharsets.UTF_8.name());
        alternative.addBodyPart(text);
        MimeBodyPart html = new MimeBodyPart();
        html.setContent(mail.html(), "text/html; charset=UTF-8");
        alternative.addBodyPart(html);

        MimeMultipart related = new MimeMultipart("related");
        MimeBodyPart body = new MimeBodyPart();
        body.setContent(alternative);
        related.addBodyPart(body);
        try (InputStream logo = MailService.class.getResourceAsStream("/mail/logo-white.png")) {
            if (logo != null) {
                MimeBodyPart image = new MimeBodyPart();
                image.setDataHandler(new DataHandler(new ByteArrayDataSource(logo.readAllBytes(), "image/png")));
                image.setContentID("<logo>");
                image.setDisposition(MimeBodyPart.INLINE);
                image.setFileName("logo.png");
                related.addBodyPart(image);
            }
        }
        return related;
    }
}
