-- Marketing execution provenance v1
-- Preserve the exact channel variant used when a Content Item becomes a Post.

ALTER TABLE marketing_content_item_variants
  ADD CONSTRAINT marketing_content_item_variants_id_content_item_key
  UNIQUE (id, content_item_id);

ALTER TABLE marketing_content_item_posts
  ADD COLUMN variant_id bigint;

ALTER TABLE marketing_content_item_posts
  ADD CONSTRAINT marketing_content_item_posts_variant_content_item_fk
  FOREIGN KEY (variant_id, content_item_id)
  REFERENCES marketing_content_item_variants(id, content_item_id)
  ON DELETE CASCADE;

CREATE INDEX idx_marketing_content_item_posts_variant
  ON marketing_content_item_posts(variant_id);
