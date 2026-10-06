-- Provider-neutral commerce publish operation ledger.
-- Stores idempotency/reconciliation state without storing provider secrets or payload bodies.

CREATE TABLE commerce_publish_operations (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id bigint NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  operation varchar(30) NOT NULL
    CHECK (operation IN ('create', 'update', 'inventory', 'price')),
  idempotency_key varchar(255) NOT NULL,
  request_fingerprint char(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'in_progress', 'succeeded', 'failed', 'unknown')),
  external_id text,
  attempt_count integer NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  last_error text,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_commerce_publish_operation_key
    UNIQUE (user_id, provider, idempotency_key)
);

CREATE INDEX idx_commerce_publish_operations_listing
  ON commerce_publish_operations(listing_id);
CREATE INDEX idx_commerce_publish_operations_status
  ON commerce_publish_operations(status);
