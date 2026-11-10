package com.iba.testing.platform;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "platform_settings")
public class PlatformSetting {

    @Id
    @Column(name = "setting_key", length = 80)
    private String key;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "setting_value", nullable = false)
    private JsonNode value;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public JsonNode getValue() {
        return value;
    }

    public void setValue(JsonNode value) {
        this.value = value;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
