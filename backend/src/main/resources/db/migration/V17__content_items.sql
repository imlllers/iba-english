ALTER TABLE material_blocks
    ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE material_blocks
SET items = (CASE
                 WHEN media_id IS NOT NULL AND media_id <> '' THEN jsonb_build_array(jsonb_build_object(
                         'id', gen_random_uuid()::text,
                         'kind', COALESCE(NULLIF(media_kind, ''), 'image'),
                         'mediaId', media_id))
                 ELSE '[]'::jsonb
             END)
            || jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'kind', 'text', 'doc', content));
