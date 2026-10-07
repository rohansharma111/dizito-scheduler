-- Dizito media/video capability foundation.
-- Additive only: preserve existing image publishing and existing media rows.

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS media_type varchar(16)
    NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS duration_seconds numeric(12,3);

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS poster_url text;

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS processing_state varchar(16)
    NOT NULL DEFAULT 'ready'
    CHECK (processing_state IN ('pending', 'uploading', 'processing', 'ready', 'failed'));

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS upload_protocol varchar(32)
    NOT NULL DEFAULT 'server_proxy'
    CHECK (upload_protocol IN ('server_proxy', 'cloudinary_signed_direct'));

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS processing_error text;

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS metadata jsonb
    NOT NULL DEFAULT '{}'::jsonb;

UPDATE media_library
SET media_type = CASE WHEN lower(resource_type) = 'video' THEN 'video' ELSE 'image' END
WHERE media_type = 'image';

CREATE INDEX IF NOT EXISTS idx_media_user_type
  ON media_library (user_id, media_type);

CREATE INDEX IF NOT EXISTS idx_media_processing_state
  ON media_library (processing_state)
  WHERE deleted_at IS NULL;
