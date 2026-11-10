package com.iba.testing.question;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.section.MaterialBlock;
import com.iba.testing.section.SectionPart;
import com.iba.testing.section.TestSection;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "questions")
public class Question {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private TestSection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id")
    private SectionPart part;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_block_id")
    private MaterialBlock materialBlock;

    @Convert(converter = QuestionTypeConverter.class)
    @Column(nullable = false, length = 40)
    private QuestionType type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prompt_content", nullable = false)
    private JsonNode promptContent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode options;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_key", nullable = false)
    private JsonNode answerKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scoring_config", nullable = false)
    private JsonNode scoringConfig;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(nullable = false)
    private boolean required;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode settings;

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

    public MaterialBlock getMaterialBlock() {
        return materialBlock;
    }

    public void setMaterialBlock(MaterialBlock materialBlock) {
        this.materialBlock = materialBlock;
    }

    public QuestionType getType() {
        return type;
    }

    public void setType(QuestionType type) {
        this.type = type;
    }

    public JsonNode getPromptContent() {
        return promptContent;
    }

    public void setPromptContent(JsonNode promptContent) {
        this.promptContent = promptContent;
    }

    public JsonNode getOptions() {
        return options;
    }

    public void setOptions(JsonNode options) {
        this.options = options;
    }

    public JsonNode getAnswerKey() {
        return answerKey;
    }

    public void setAnswerKey(JsonNode answerKey) {
        this.answerKey = answerKey;
    }

    public JsonNode getScoringConfig() {
        return scoringConfig;
    }

    public void setScoringConfig(JsonNode scoringConfig) {
        this.scoringConfig = scoringConfig;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public JsonNode getSettings() {
        return settings;
    }

    public void setSettings(JsonNode settings) {
        this.settings = settings;
    }
}
