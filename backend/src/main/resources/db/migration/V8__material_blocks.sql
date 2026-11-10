CREATE TABLE material_blocks (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES test_sections (id) ON DELETE CASCADE,
    part_id UUID REFERENCES section_parts (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL DEFAULT '',
    content JSONB NOT NULL,
    media_id VARCHAR(64),
    media_kind VARCHAR(20),
    order_index INTEGER NOT NULL
);

CREATE INDEX material_blocks_section_idx ON material_blocks (section_id, order_index);
CREATE INDEX material_blocks_part_idx ON material_blocks (part_id, order_index);

ALTER TABLE questions
    ADD COLUMN material_block_id UUID REFERENCES material_blocks (id) ON DELETE SET NULL;

CREATE INDEX questions_material_block_idx ON questions (material_block_id, order_index);
