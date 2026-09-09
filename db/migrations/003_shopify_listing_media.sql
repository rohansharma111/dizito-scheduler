-- Persist the mapping between canonical product media and provider media.
-- This follows the listing/variant mapping pattern and avoids provider-specific
-- fields on product_media or media_library.

CREATE TABLE product_listing_media (
  id bigserial PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  product_media_id bigint NOT NULL REFERENCES product_media(id) ON DELETE CASCADE,
  external_id text,
  sync_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_listing_media UNIQUE (listing_id, product_media_id)
);

CREATE INDEX idx_product_listing_media_listing ON product_listing_media(listing_id);
CREATE INDEX idx_product_listing_media_product_media ON product_listing_media(product_media_id);
CREATE INDEX idx_product_listing_media_sync_status ON product_listing_media(sync_status);

-- Ownership/product consistency is enforced by the application service.
