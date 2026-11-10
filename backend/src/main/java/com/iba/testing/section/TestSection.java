package com.iba.testing.section;

import com.fasterxml.jackson.databind.JsonNode;
import com.iba.testing.test.ExamTest;
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

import java.util.UUID;

@Entity
@Table(name = "test_sections")
public class TestSection {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_id", nullable = false)
    private ExamTest test;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private String instructions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode items;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_type", nullable = false, length = 40)
    private SectionType sectionType;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Column(name = "allow_back_to_questions")
    private Boolean allowBackToQuestions;

    @Column(name = "allow_back_to_part")
    private Boolean allowBackToPart;

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

    public JsonNode getItems() {
        return items;
    }

    public void setItems(JsonNode items) {
        this.items = items;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    public SectionType getSectionType() {
        return sectionType;
    }

    public void setSectionType(SectionType sectionType) {
        this.sectionType = sectionType;
    }

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public Boolean getAllowBackToQuestions() {
        return allowBackToQuestions;
    }

    public void setAllowBackToQuestions(Boolean allowBackToQuestions) {
        this.allowBackToQuestions = allowBackToQuestions;
    }

    public Boolean getAllowBackToPart() {
        return allowBackToPart;
    }

    public void setAllowBackToPart(Boolean allowBackToPart) {
        this.allowBackToPart = allowBackToPart;
    }
}
