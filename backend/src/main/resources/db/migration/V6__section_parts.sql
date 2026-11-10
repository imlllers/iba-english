CREATE TABLE section_parts (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES test_sections (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    order_index INTEGER NOT NULL
);

CREATE INDEX section_parts_section_idx ON section_parts (section_id, order_index);

ALTER TABLE questions
    ADD COLUMN part_id UUID REFERENCES section_parts (id) ON DELETE SET NULL;

CREATE INDEX questions_part_idx ON questions (part_id, order_index);
