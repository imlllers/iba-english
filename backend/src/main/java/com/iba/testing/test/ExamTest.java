package com.iba.testing.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "tests")
public class ExamTest {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private String description;

    @Column(name = "exam_preset", length = 40)
    private String examPreset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TestStatus status;

    @Column(name = "public_token", length = 80, unique = true)
    private String publicToken;

    @Column(name = "public_token_expires_at")
    private OffsetDateTime publicTokenExpiresAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode settings;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getExamPreset() {
        return examPreset;
    }

    public void setExamPreset(String examPreset) {
        this.examPreset = examPreset;
    }

    public TestStatus getStatus() {
        return status;
    }

    public void setStatus(TestStatus status) {
        this.status = status;
    }

    public String getPublicToken() {
        return publicToken;
    }

    public void setPublicToken(String publicToken) {
        this.publicToken = publicToken;
    }

    public OffsetDateTime getPublicTokenExpiresAt() {
        return publicTokenExpiresAt;
    }

    public void setPublicTokenExpiresAt(OffsetDateTime publicTokenExpiresAt) {
        this.publicTokenExpiresAt = publicTokenExpiresAt;
    }

    public JsonNode getSettings() {
        return settings;
    }

    public void setSettings(JsonNode settings) {
        this.settings = settings;
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
}
