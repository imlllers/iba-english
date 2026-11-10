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
@Table(name = "section_parts")
public class SectionPart {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private TestSection section;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private String instructions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private JsonNode items;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Column(name = "one_question_per_page")
    private Boolean oneQuestionPerPage;

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

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public Boolean getOneQuestionPerPage() {
        return oneQuestionPerPage;
    }

    public void setOneQuestionPerPage(Boolean oneQuestionPerPage) {
        this.oneQuestionPerPage = oneQuestionPerPage;
    }
}
