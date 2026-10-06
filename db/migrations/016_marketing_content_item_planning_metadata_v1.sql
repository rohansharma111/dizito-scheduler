ALTER TABLE marketing_content_items
  ADD COLUMN planning_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN marketing_content_items.planning_metadata IS
  'Internal planning provenance and evidence metadata; not publisher-facing content.';
