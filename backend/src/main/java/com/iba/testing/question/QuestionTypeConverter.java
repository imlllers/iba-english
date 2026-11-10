package com.iba.testing.question;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class QuestionTypeConverter implements AttributeConverter<QuestionType, String> {

    @Override
    public String convertToDatabaseColumn(QuestionType attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public QuestionType convertToEntityAttribute(String dbData) {
        return dbData == null || dbData.isBlank() ? null : QuestionType.canonicalize(dbData);
    }
}
