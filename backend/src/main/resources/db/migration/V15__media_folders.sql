CREATE TABLE media_folders (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_id UUID REFERENCES media_folders (id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX media_folders_owner_parent_idx ON media_folders (owner_id, parent_id);

CREATE UNIQUE INDEX media_folders_owner_parent_name_uq
    ON media_folders (
        owner_id,
        (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        lower(name)
    );

ALTER TABLE media_assets
    ADD COLUMN folder_id UUID REFERENCES media_folders (id) ON DELETE SET NULL;

CREATE INDEX media_assets_folder_idx ON media_assets (folder_id);
