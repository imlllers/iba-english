package com.iba.testing.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iba.testing.attempt.AttemptStatus;
import com.iba.testing.attempt.TestAttemptRepository;
import com.iba.testing.audit.AuditService;
import com.iba.testing.common.exception.ApiException;
import com.iba.testing.config.AppProperties;
import com.iba.testing.mail.MailSettings;
import com.iba.testing.media.MediaAsset;
import com.iba.testing.media.MediaAssetRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PlatformService {

    public static final String UPLOAD = "maxUploadBytes";
    public static final String RETENTION = "attemptRetentionDays";
    public static final String LINK_HOURS = "linkLifetimeHours";
    public static final int DEFAULT_LINK_HOURS = 12;
    public static final List<String> UPLOAD_KINDS = List.of("audio", "image", "recording", "video");

    private final PlatformSettingRepository settings;
    private final AppProperties properties;
    private final AuditService audit;
    private final ObjectMapper mapper;
    private final TestAttemptRepository attempts;
    private final MediaAssetRepository assets;

    public PlatformService(PlatformSettingRepository settings, AppProperties properties, AuditService audit, ObjectMapper mapper,
                           TestAttemptRepository attempts, MediaAssetRepository assets) {
        this.settings = settings;
        this.properties = properties;
        this.audit = audit;
        this.mapper = mapper;
        this.attempts = attempts;
        this.assets = assets;
    }

    @Transactional(readOnly = true)
    public ObjectNode current() {
        ObjectNode node = mapper.createObjectNode();
        node.put(UPLOAD, uploadLimit());
        ObjectNode limits = node.putObject("uploadLimits");
        for (String kind : UPLOAD_KINDS) {
            limits.put(kind, uploadLimit(kind));
        }
        node.put("serverMaxUploadBytes", properties.getMaxUploadBytes());
        node.put(RETENTION, retentionDays());
        node.put(LINK_HOURS, linkLifetimeHours());
        return node;
    }

    @Transactional
    public ObjectNode update(UUID actorId, Long maxUploadBytes, Map<String, Long> uploadLimits, int retentionDays, int linkLifetimeHours) {
        if (maxUploadBytes != null) {
            checkUploadLimit(maxUploadBytes);
        }
        Map<String, Long> limits = uploadLimits == null ? Map.of() : uploadLimits;
        for (Map.Entry<String, Long> entry : limits.entrySet()) {
            if (!UPLOAD_KINDS.contains(entry.getKey()) || entry.getValue() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Неизвестный вид файла");
            }
            checkUploadLimit(entry.getValue());
        }
        if (retentionDays < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Срок хранения не может быть отрицательным");
        }
        if (linkLifetimeHours < 0 || linkLifetimeHours > 168) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Срок ссылки от 0 до 168 часов");
        }
        if (maxUploadBytes != null) {
            save(UPLOAD, mapper.createObjectNode().put("value", maxUploadBytes));
        }
        limits.forEach((kind, bytes) -> save(UPLOAD + "." + kind, mapper.createObjectNode().put("value", bytes)));
        save(RETENTION, mapper.createObjectNode().put("value", retentionDays));
        save(LINK_HOURS, mapper.createObjectNode().put("value", linkLifetimeHours));
        audit.record(actorId, "SETTINGS_UPDATED", "PLATFORM", null);
        return current();
    }

    public MailSettings mailSettings() {
        return envMail();
    }

    private MailSettings emptyMail() {
        return new MailSettings(false, "", 587, "", "", "", "IBA English", true);
    }

    private MailSettings envMail() {
        var defaults = properties.getMail();
        if (defaults == null) {
            return emptyMail();
        }
        String from = defaults.getFromEmail() == null || defaults.getFromEmail().isBlank()
                ? defaults.getUsername()
                : defaults.getFromEmail();
        return new MailSettings(
                defaults.isEnabled(),
                defaults.getHost() == null ? "smtp.gmail.com" : defaults.getHost(),
                defaults.getPort() > 0 ? defaults.getPort() : 587,
                defaults.getUsername() == null ? "" : defaults.getUsername(),
                defaults.getPassword() == null ? "" : defaults.getPassword(),
                from == null ? "" : from,
                defaults.getFromName() == null || defaults.getFromName().isBlank() ? "IBA English" : defaults.getFromName(),
                defaults.isStartTls()
        );
    }

    public long uploadLimit() {
        return settings.findById(UPLOAD)
                .map(item -> item.getValue().path("value").asLong(properties.getMaxUploadBytes()))
                .orElse(properties.getMaxUploadBytes());
    }

    public long uploadLimit(String kind) {
        long fallback = uploadLimit();
        return settings.findById(UPLOAD + "." + kind)
                .map(item -> item.getValue().path("value").asLong(fallback))
                .orElse(fallback);
    }

    private void checkUploadLimit(long bytes) {
        if (bytes < 1 || bytes > properties.getMaxUploadBytes()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION", "Размер файла вне допустимого предела");
        }
    }

    public int retentionDays() {
        return settings.findById(RETENTION).map(item -> item.getValue().path("value").asInt(0)).orElse(0);
    }

    public int linkLifetimeHours() {
        return DEFAULT_LINK_HOURS;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeOldAttempts() {
        int days = retentionDays();
        if (days <= 0) {
            return;
        }
        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(days);
        var old = attempts.findFinishedBefore(AttemptStatus.IN_PROGRESS, cutoff, PageRequest.of(0, 200));
        for (var attempt : old) {
            for (MediaAsset asset : assets.findByAttempt(attempt)) {
                try {
                    Files.deleteIfExists(Path.of(properties.getMediaDir()).resolve(asset.getStorageKey()));
                } catch (IOException ignored) {
                    continue;
                }
            }
        }
        attempts.deleteAll(old);
    }

    private void save(String key, com.fasterxml.jackson.databind.JsonNode value) {
        PlatformSetting setting = settings.findById(key).orElseGet(PlatformSetting::new);
        setting.setKey(key);
        setting.setValue(value);
        setting.setUpdatedAt(OffsetDateTime.now());
        settings.save(setting);
    }
}
