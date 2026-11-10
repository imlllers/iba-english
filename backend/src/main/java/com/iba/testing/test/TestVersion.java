package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_versions")
public class TestVersion {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_id", nullable = false)
    private ExamTest test;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_snapshot", nullable = false)
    private JsonNode contentSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings_snapshot", nullable = false)
    private JsonNode settingsSnapshot;

    @Column(name = "published_at", nullable = false)
    private OffsetDateTime publishedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ExamTest getTest() {
        return test;
    }

    public void setTest(ExamTest test) {
        this.test = test;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public JsonNode getContentSnapshot() {
        return contentSnapshot;
    }

    public void setContentSnapshot(JsonNode contentSnapshot) {
        this.contentSnapshot = contentSnapshot;
    }

    public JsonNode getSettingsSnapshot() {
        return settingsSnapshot;
    }

    public void setSettingsSnapshot(JsonNode settingsSnapshot) {
        this.settingsSnapshot = settingsSnapshot;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(OffsetDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }
}
