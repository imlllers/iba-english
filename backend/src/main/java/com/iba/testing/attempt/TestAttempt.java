package com.iba.testing.attempt;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.test.TestVersion;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_attempts")
public class TestAttempt {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_version_id", nullable = false)
    private TestVersion testVersion;

    @Column(name = "participant_name", length = 120)
    private String participantName;

    @Column(name = "participant_email", length = 254)
    private String participantEmail;

    @Column(name = "access_token_hash", nullable = false, unique = true, length = 64)
    private String accessTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttemptStatus status;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(precision = 10, scale = 2)
    private BigDecimal score;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode progress;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scale_result")
    private JsonNode scaleResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scale_manual")
    private JsonNode scaleManual;

    @Column(name = "scale_level", length = 40)
    private String scaleLevel;

    @Column(name = "result_emailed_at")
    private OffsetDateTime resultEmailedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public TestVersion getTestVersion() {
        return testVersion;
    }

    public void setTestVersion(TestVersion testVersion) {
        this.testVersion = testVersion;
    }

    public String getParticipantName() {
        return participantName;
    }

    public void setParticipantName(String participantName) {
        this.participantName = participantName;
    }

    public String getParticipantEmail() {
        return participantEmail;
    }

    public void setParticipantEmail(String participantEmail) {
        this.participantEmail = participantEmail;
    }

    public String getAccessTokenHash() {
        return accessTokenHash;
    }

    public void setAccessTokenHash(String accessTokenHash) {
        this.accessTokenHash = accessTokenHash;
    }

    public AttemptStatus getStatus() {
        return status;
    }

    public void setStatus(AttemptStatus status) {
        this.status = status;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public BigDecimal getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(BigDecimal maxScore) {
        this.maxScore = maxScore;
    }

    public JsonNode getProgress() {
        return progress;
    }

    public void setProgress(JsonNode progress) {
        this.progress = progress;
    }

    public JsonNode getScaleResult() {
        return scaleResult;
    }

    public void setScaleResult(JsonNode scaleResult) {
        this.scaleResult = scaleResult;
    }

    public JsonNode getScaleManual() {
        return scaleManual;
    }

    public void setScaleManual(JsonNode scaleManual) {
        this.scaleManual = scaleManual;
    }

    public String getScaleLevel() {
        return scaleLevel;
    }

    public void setScaleLevel(String scaleLevel) {
        this.scaleLevel = scaleLevel;
    }

    public OffsetDateTime getResultEmailedAt() {
        return resultEmailedAt;
    }

    public void setResultEmailedAt(OffsetDateTime resultEmailedAt) {
        this.resultEmailedAt = resultEmailedAt;
    }
}
