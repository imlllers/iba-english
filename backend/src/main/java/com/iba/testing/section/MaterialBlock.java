package com.iba.testing.section;

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

import java.util.UUID;

@Entity
@Table(name = "material_blocks")
public class MaterialBlock {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private TestSection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id")
    private SectionPart part;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private String instructions = "";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode items;

    @Column(name = "media_id", length = 64)
    private String mediaId;

    @Column(name = "media_kind", length = 20)
    private String mediaKind;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public TestSection getSection() {
        return section;
    }

    public void setSection(TestSection section) {
        this.section = section;
    }

    public SectionPart getPart() {
        return part;
    }

    public void setPart(SectionPart part) {
        this.part = part;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public JsonNode getContent() {
        return content;
    }

    public void setContent(JsonNode content) {
        this.content = content;
    }

    public JsonNode getItems() {
        return items;
    }

    public void setItems(JsonNode items) {
        this.items = items;
    }

    public String getMediaId() {
        return mediaId;
    }

    public void setMediaId(String mediaId) {
        this.mediaId = mediaId;
    }

    public String getMediaKind() {
        return mediaKind;
    }

    public void setMediaKind(String mediaKind) {
        this.mediaKind = mediaKind;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }
}
