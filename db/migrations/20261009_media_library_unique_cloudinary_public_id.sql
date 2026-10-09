-- Prevent concurrent completion requests from persisting duplicate rows for
-- the same user's Cloudinary asset. The migration runner wraps each file in a
-- transaction; fail loudly if historical duplicates appeared after the last scan.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.media_library
    GROUP BY user_id, cloudinary_public_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create media_library uniqueness index: duplicate (user_id, cloudinary_public_id) pairs exist. Resolve duplicates before retrying.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS media_library_user_cloudinary_public_id_uidx
  ON public.media_library (user_id, cloudinary_public_id);
