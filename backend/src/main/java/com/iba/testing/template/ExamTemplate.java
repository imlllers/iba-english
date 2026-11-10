package com.iba.testing.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.user.UserAccount;
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
@Table(name = "exam_templates")
public class ExamTemplate {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 20)
    private String family;

    @Column(name = "builtin_key", length = 20)
    private String builtinKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode sections;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_settings", nullable = false)
    private JsonNode defaultSettings;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UserAccount getOwner() {
        return owner;
    }

    public void setOwner(UserAccount owner) {
        this.owner = owner;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getFamily() {
        return family;
    }

    public void setFamily(String family) {
        this.family = family;
    }

    public String getBuiltinKey() {
        return builtinKey;
    }

    public void setBuiltinKey(String builtinKey) {
        this.builtinKey = builtinKey;
    }

    public JsonNode getSections() {
        return sections;
    }

    public void setSections(JsonNode sections) {
        this.sections = sections;
    }

    public JsonNode getDefaultSettings() {
        return defaultSettings;
    }

    public void setDefaultSettings(JsonNode defaultSettings) {
        this.defaultSettings = defaultSettings;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isBuiltin() {
        return builtinKey != null && !builtinKey.isBlank();
    }
}
