-- Commerce listing/channel contract.
-- Canonical catalog remains in products/product_variants/product_media.
-- This migration adds only the provider-neutral commerce layer.

CREATE TABLE commerce_channels (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  name text NOT NULL,
  external_account_id text,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'error')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commerce_channels_user ON commerce_channels(user_id);
CREATE INDEX idx_commerce_channels_provider ON commerce_channels(provider);
CREATE INDEX idx_commerce_channels_status ON commerce_channels(status);

CREATE TABLE product_listings (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id bigint NOT NULL REFERENCES commerce_channels(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  sync_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  external_id text,
  last_synced_at timestamptz,
  last_error text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_listing_channel UNIQUE (product_id, channel_id)
);

CREATE INDEX idx_product_listings_user ON product_listings(user_id);
CREATE INDEX idx_product_listings_channel ON product_listings(channel_id);
CREATE INDEX idx_product_listings_product ON product_listings(product_id);
CREATE INDEX idx_product_listings_sync_status ON product_listings(sync_status);

CREATE TABLE product_listing_variants (
  id bigserial PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  variant_id bigint NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  external_id text,
  sync_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_listing_variant UNIQUE (listing_id, variant_id)
);

CREATE INDEX idx_product_listing_variants_listing ON product_listing_variants(listing_id);
CREATE INDEX idx_product_listing_variants_variant ON product_listing_variants(variant_id);
CREATE INDEX idx_product_listing_variants_sync_status ON product_listing_variants(sync_status);

-- Tenant ownership is enforced by application service transactions when creating
-- listings and variant mappings; existing products/variants remain unchanged.
