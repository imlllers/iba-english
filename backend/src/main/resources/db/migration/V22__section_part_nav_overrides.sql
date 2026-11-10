ALTER TABLE test_sections
    ADD COLUMN allow_back_to_questions BOOLEAN,
    ADD COLUMN allow_back_to_part BOOLEAN;

ALTER TABLE section_parts
    ADD COLUMN one_question_per_page BOOLEAN;
