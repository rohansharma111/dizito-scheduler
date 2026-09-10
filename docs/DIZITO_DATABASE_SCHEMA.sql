CREATE SCHEMA "public";

-- Canonical database schema snapshot supplied by the project owner.
-- This file is reference documentation for ChatGPT/Commerce/Marketing development chats.
-- It describes the current database schema and constraints; it is not itself a migration.

CREATE TABLE "amazon_channel_credentials" (
	"id" bigserial PRIMARY KEY,
	"channel_id" bigint NOT NULL CONSTRAINT "amazon_channel_credentials_channel_id_key" UNIQUE,
	"refresh_token_encrypted" text NOT NULL,
	"refresh_token_expires_at" timestamp with time zone,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "billing_events" (
	"id" bigserial PRIMARY KEY,
	"user_id" bigint,
	"event" varchar(100),
	"amount" integer,
	"plan" varchar(50),
	"subscription_id" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "commerce_channel_credentials" (
	"id" bigserial PRIMARY KEY,
	"channel_id" bigint NOT NULL CONSTRAINT "commerce_channel_credentials_channel_id_key" UNIQUE,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "commerce_channels" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"external_account_id" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_channels_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'error'::character varying])::text[])))
);
CREATE TABLE "customer_addresses" (
	"id" bigserial PRIMARY KEY,
	"customer_id" bigint NOT NULL,
	"address_type" varchar(20) DEFAULT 'shipping' NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text,
	"state" text,
	"postal_code" varchar(30),
	"country_code" varchar(2) NOT NULL,
	"phone" varchar(50),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_addresses_address_type_check" CHECK (((address_type)::text = ANY ((ARRAY['billing'::character varying, 'shipping'::character varying, 'other'::character varying])::text[]))),
	CONSTRAINT "customer_addresses_country_code_check" CHECK (((country_code)::text ~ '^[A-Z]{2}$'::text))
);
CREATE TABLE "customer_notes" (
	"id" bigserial PRIMARY KEY,
	"customer_id" bigint NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "customer_tag_assignments" (
	"customer_id" bigint,
	"tag_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY("customer_id","tag_id")
);
CREATE TABLE "customer_tags" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tags_user_id_name_key" UNIQUE("user_id","name")
);
CREATE TABLE "customers" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" text,
	"email" text,
	"phone" varchar(50),
	"company" text,
	"country_code" varchar(2),
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_country_code_check" CHECK (((country_code IS NULL) OR ((country_code)::text ~ '^[A-Z]{2}$'::text))),
	CONSTRAINT "customers_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);
CREATE TABLE "inventory_balances" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"location_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"quantity_reserved" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_unique_variant_location" UNIQUE("location_id","variant_id"),
	CONSTRAINT "inventory_balances_non_negative_on_hand" CHECK ((quantity_on_hand >= 0)),
	CONSTRAINT "inventory_balances_non_negative_reserved" CHECK ((quantity_reserved >= 0)),
	CONSTRAINT "inventory_balances_reserved_not_above_on_hand" CHECK ((quantity_reserved <= quantity_on_hand))
);
CREATE TABLE "inventory_locations" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) DEFAULT 'warehouse' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "inventory_movements" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"location_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" bigint,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_quantity_not_zero" CHECK ((quantity <> 0))
);
CREATE TABLE "media_library" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"original_name" text,
	"file_name" text NOT NULL,
	"secure_url" text NOT NULL,
	"format" varchar(20) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" bigint NOT NULL,
	"resource_type" varchar(20) DEFAULT 'image' NOT NULL,
	"folder" text,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
CREATE TABLE "oauth_page_selections" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"access_token" text NOT NULL,
	"pages" json NOT NULL,
	"created_at" date DEFAULT '2026-06-13',
	"reconnect_account_id" integer,
	"reconnect_type" text
);
CREATE TABLE "order_addresses" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"address_type" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text,
	"state" text,
	"postal_code" varchar(30),
	"country_code" varchar(2) NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_addresses_address_type_check" CHECK (((address_type)::text = ANY ((ARRAY['billing'::character varying, 'shipping'::character varying])::text[]))),
	CONSTRAINT "order_addresses_country_code_check" CHECK (((country_code)::text ~ '^[A-Z]{2}$'::text))
);
CREATE TABLE "order_external_references" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"source" varchar(50) NOT NULL,
	"external_order_id" text NOT NULL,
	"external_order_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_external_references_source_external_order_id_key" UNIQUE("source","external_order_id")
);
CREATE TABLE "order_inventory_allocations" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"order_item_id" bigint NOT NULL,
	"location_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"status" varchar(30) DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_inventory_allocations_quantity_check" CHECK ((quantity > 0)),
	CONSTRAINT "order_inventory_allocations_status_check" CHECK (((status)::text = ANY ((ARRAY['reserved'::character varying, 'released'::character varying, 'fulfilled'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE TABLE "order_items" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text,
	"sku" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_discount_check" CHECK ((discount >= 0)),
	CONSTRAINT "order_items_quantity_check" CHECK ((quantity > 0)),
	CONSTRAINT "order_items_tax_check" CHECK ((tax >= 0)),
	CONSTRAINT "order_items_total_check" CHECK ((total >= 0)),
	CONSTRAINT "order_items_unit_price_check" CHECK ((unit_price >= 0))
);
CREATE TABLE "order_payment_attempts" (
	"id" bigserial PRIMARY KEY,
	"payment_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_payment_attempts_provider_provider_payment_id_key" UNIQUE("provider","provider_payment_id"),
	CONSTRAINT "order_payment_attempts_amount_check" CHECK ((amount >= 0)),
	CONSTRAINT "order_payment_attempts_currency_check" CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
	CONSTRAINT "order_payment_attempts_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'authorized'::character varying, 'captured'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying])::text[])))
);
CREATE TABLE "order_payments" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"payment_method" varchar(50),
	"transaction_id" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL CONSTRAINT "order_payments_idempotency_key_unique" UNIQUE,
	"provider_order_id" text,
	CONSTRAINT "order_payments_amount_check" CHECK ((amount >= 0)),
	CONSTRAINT "order_payments_currency_check" CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
	CONSTRAINT "order_payments_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'authorized'::character varying, 'paid'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying])::text[])))
);
CREATE TABLE "order_refunds" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"payment_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_refund_id" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL CONSTRAINT "order_refunds_idempotency_key_unique" UNIQUE,
	"reason" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_refunds_amount_check" CHECK ((amount >= 0)),
	CONSTRAINT "order_refunds_currency_check" CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
	CONSTRAINT "order_refunds_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE TABLE "order_return_items" (
	"id" bigserial PRIMARY KEY,
	"return_id" bigint NOT NULL,
	"order_item_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"refund_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_return_items_return_id_order_item_id_key" UNIQUE("return_id","order_item_id"),
	CONSTRAINT "order_return_items_quantity_check" CHECK ((quantity > 0)),
	CONSTRAINT "order_return_items_refund_amount_check" CHECK ((refund_amount >= 0))
);
CREATE TABLE "order_returns" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'requested' NOT NULL,
	"reason" varchar(100),
	"customer_note" text,
	"refund_amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"received_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"refund_id" bigint,
	CONSTRAINT "order_returns_currency_check" CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
	CONSTRAINT "order_returns_refund_amount_check" CHECK ((refund_amount >= 0)),
	CONSTRAINT "order_returns_status_check" CHECK (((status)::text = ANY ((ARRAY['requested'::character varying, 'approved'::character varying, 'rejected'::character varying, 'in_transit'::character varying, 'received'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE TABLE "order_shipment_items" (
	"id" bigserial PRIMARY KEY,
	"shipment_id" bigint NOT NULL,
	"order_item_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_shipment_items_shipment_id_order_item_id_key" UNIQUE("shipment_id","order_item_id"),
	CONSTRAINT "order_shipment_items_quantity_check" CHECK ((quantity > 0))
);
CREATE TABLE "order_shipments" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"location_id" bigint,
	"carrier" varchar(100),
	"service" varchar(100),
	"tracking_number" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_shipments_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'ready'::character varying, 'shipped'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'returned'::character varying])::text[])))
);
CREATE TABLE "order_status_history" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"status_type" varchar(30) NOT NULL,
	"old_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"source" varchar(50) DEFAULT 'system' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_history_status_type_check" CHECK (((status_type)::text = ANY ((ARRAY['order'::character varying, 'payment'::character varying, 'fulfillment'::character varying])::text[])))
);
CREATE TABLE "order_taxes" (
	"id" bigserial PRIMARY KEY,
	"order_id" bigint NOT NULL,
	"tax_name" varchar(100) NOT NULL,
	"tax_type" varchar(50),
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"taxable_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"jurisdiction" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_taxes_tax_amount_check" CHECK ((tax_amount >= 0)),
	CONSTRAINT "order_taxes_tax_rate_check" CHECK ((tax_rate >= (0)::numeric)),
	CONSTRAINT "order_taxes_taxable_amount_check" CHECK ((taxable_amount >= 0))
);
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"order_number" varchar(100) NOT NULL,
	"source" varchar(50) DEFAULT 'manual' NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" varchar(50),
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"shipping_fee" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"payment_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"order_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"fulfillment_status" varchar(50) DEFAULT 'unfulfilled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"customer_id" bigint,
	CONSTRAINT "orders_user_id_order_number_key" UNIQUE("user_id","order_number"),
	CONSTRAINT "orders_currency_format_check" CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
	CONSTRAINT "orders_discount_check" CHECK ((discount >= 0)),
	CONSTRAINT "orders_fulfillment_status_check" CHECK (((fulfillment_status)::text = ANY ((ARRAY['unfulfilled'::character varying, 'partially_fulfilled'::character varying, 'fulfilled'::character varying, 'returned'::character varying])::text[]))),
	CONSTRAINT "orders_order_status_check" CHECK (((order_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
	CONSTRAINT "orders_payment_status_check" CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying])::text[]))),
	CONSTRAINT "orders_shipping_fee_check" CHECK ((shipping_fee >= 0)),
	CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= 0)),
	CONSTRAINT "orders_tax_check" CHECK ((tax >= 0)),
	CONSTRAINT "orders_total_check" CHECK ((total >= 0))
);
CREATE TABLE "payment_webhook_events" (
	"id" bigserial PRIMARY KEY,
	"provider" varchar(50) NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payment_id" bigint,
	"refund_id" bigint,
	"status" varchar(30) DEFAULT 'received' NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider_payment_id" text,
	"provider_refund_id" text,
	CONSTRAINT "payment_webhook_events_provider_provider_event_id_key" UNIQUE("provider","provider_event_id"),
	CONSTRAINT "payment_webhook_events_status_check" CHECK (((status)::text = ANY ((ARRAY['received'::character varying, 'processing'::character varying, 'processed'::character varying, 'failed'::character varying])::text[])))
);
CREATE TABLE "post_target_attempts" (
	"id" bigserial PRIMARY KEY,
	"post_target_id" bigint NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "post_targets" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"social_account_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'scheduled',
	"publish_message" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"processing_started_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"retry_count" integer DEFAULT 0,
	"publish_lock_uuid" uuid,
	"next_retry_at" timestamp,
	"manual_retry_count" integer DEFAULT 0
);
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY,
	"post" text NOT NULL,
	"schedule_time" timestamp with time zone,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(20) DEFAULT 'scheduled',
	"publish_message" text,
	"image_url" text,
	"user_id" integer,
	"processing_started_at" timestamp,
	"published_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"media_id" integer
);
CREATE TABLE "product_listing_media" (
	"id" bigserial PRIMARY KEY,
	"listing_id" bigint NOT NULL,
	"product_media_id" bigint NOT NULL,
	"external_id" text,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"provider_metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_listing_media" UNIQUE("listing_id","product_media_id"),
	CONSTRAINT "product_listing_media_sync_status_check" CHECK (((sync_status)::text = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'synced'::character varying, 'error'::character varying])::text[])))
);
CREATE TABLE "product_listing_variants" (
	"id" bigserial PRIMARY KEY,
	"listing_id" bigint NOT NULL,
	"variant_id" bigint NOT NULL,
	"external_id" text,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"provider_metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_listing_variant" UNIQUE("listing_id","variant_id"),
	CONSTRAINT "product_listing_variants_sync_status_check" CHECK (((sync_status)::text = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'synced'::character varying, 'error'::character varying])::text[])))
);
CREATE TABLE "product_listings" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"channel_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"external_id" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"provider_metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_product_listing_channel" UNIQUE("product_id","channel_id"),
	CONSTRAINT "product_listings_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'paused'::character varying, 'archived'::character varying])::text[]))),
	CONSTRAINT "product_listings_sync_status_check" CHECK (((sync_status)::text = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'synced'::character varying, 'error'::character varying])::text[])))
);
CREATE TABLE "product_media" (
	"id" bigserial PRIMARY KEY,
	"product_id" bigint NOT NULL,
	"media_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "product_variants" (
	"id" bigserial PRIMARY KEY,
	"product_id" bigint NOT NULL,
	"name" text,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"price" integer,
	"mrp" integer,
	"cost_price" integer,
	"weight" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "products" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"brand" text,
	"category" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "publish_logs" (
	"id" serial PRIMARY KEY,
	"post_id" integer,
	"status" varchar(50),
	"message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "scheduler_heartbeat" (
	"id" integer PRIMARY KEY,
	"last_run" timestamp,
	"processed" integer,
	"failures" integer
);
CREATE TABLE "schema_migrations" (
	"version" varchar(255) PRIMARY KEY,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "social_accounts" (
	"id" serial PRIMARY KEY,
	"platform" varchar(50) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"access_token" text,
	"linkedin_member_id" varchar(255),
	"page_id" text,
	"instagram_business_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"user_id" integer,
	"status" text DEFAULT 'connected',
	"last_checked_at" timestamp,
	"page_access_token" text,
	"updated_at" timestamp DEFAULT now(),
	"board_id" text,
	"pinterest_profile_id" text,
	"health_status" text DEFAULT 'unknown',
	"google_location_id" text,
	"google_account_id" text,
	"google_profile_id" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	CONSTRAINT "unique_user_page_platform" UNIQUE("user_id","page_id","platform")
);
CREATE TABLE "subscriptions" (
	"id" bigserial PRIMARY KEY,
	"user_id" bigint NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text CONSTRAINT "subscriptions_provider_subscription_id_key" UNIQUE,
	"provider_customer_id" text,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"trial_start_at" timestamp,
	"trial_end_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"ended_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"grace_period_until" timestamp,
	"payment_failed_at" timestamp
);
CREATE TABLE "system_events" (
	"id" bigserial PRIMARY KEY,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" bigint NOT NULL,
	"user_id" bigint,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now(),
	"is_read" boolean DEFAULT false
);
CREATE TABLE "user_usage" (
	"id" bigserial PRIMARY KEY,
	"user_id" bigint NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"posts_created" integer DEFAULT 0,
	"posts_published" integer DEFAULT 0,
	"accounts_connected" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"bulk_upload_rows" integer DEFAULT 0,
	"ai_images_generated" integer,
	CONSTRAINT "user_usage_user_id_year_month_key" UNIQUE("user_id","year","month")
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text CONSTRAINT "users_email_key" UNIQUE,
	"created_at" timestamp DEFAULT now(),
	"plan" varchar(50) DEFAULT 'free',
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 1,
	"subscription_id" varchar(255),
	"subscription_status" varchar(50),
	"current_period_end" timestamp,
	"name" text
);

-- Indexes
CREATE UNIQUE INDEX "amazon_channel_credentials_channel_id_key" ON "amazon_channel_credentials" ("channel_id");
CREATE UNIQUE INDEX "amazon_channel_credentials_pkey" ON "amazon_channel_credentials" ("id");
CREATE INDEX "idx_amazon_channel_credentials_channel" ON "amazon_channel_credentials" ("channel_id");
CREATE UNIQUE INDEX "billing_events_pkey" ON "billing_events" ("id");
CREATE UNIQUE INDEX "commerce_channel_credentials_channel_id_key" ON "commerce_channel_credentials" ("channel_id");
CREATE UNIQUE INDEX "commerce_channel_credentials_pkey" ON "commerce_channel_credentials" ("id");
CREATE INDEX "idx_commerce_channel_credentials_channel" ON "commerce_channel_credentials" ("channel_id");
CREATE UNIQUE INDEX "commerce_channels_pkey" ON "commerce_channels" ("id");
CREATE INDEX "idx_commerce_channels_provider" ON "commerce_channels" ("provider");
CREATE INDEX "idx_commerce_channels_status" ON "commerce_channels" ("status");
CREATE INDEX "idx_commerce_channels_user" ON "commerce_channels" ("user_id");
CREATE UNIQUE INDEX "customer_addresses_pkey" ON "customer_addresses" ("id");
CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" ("customer_id");
CREATE INDEX "idx_customer_addresses_customer_type" ON "customer_addresses" ("customer_id","address_type");
CREATE UNIQUE INDEX "customer_notes_pkey" ON "customer_notes" ("id");
CREATE INDEX "idx_customer_notes_created_at" ON "customer_notes" ("customer_id","created_at");
CREATE INDEX "idx_customer_notes_customer_id" ON "customer_notes" ("customer_id");
CREATE UNIQUE INDEX "customer_tag_assignments_pkey" ON "customer_tag_assignments" ("customer_id","tag_id");
CREATE INDEX "idx_customer_tag_assignments_tag_id" ON "customer_tag_assignments" ("tag_id");
CREATE UNIQUE INDEX "customer_tags_pkey" ON "customer_tags" ("id");
CREATE UNIQUE INDEX "customer_tags_user_id_name_key" ON "customer_tags" ("user_id","name");
CREATE INDEX "idx_customer_tags_user_id" ON "customer_tags" ("user_id");
CREATE UNIQUE INDEX "customers_pkey" ON "customers" ("id");
CREATE INDEX "idx_customers_user_created_at" ON "customers" ("user_id","created_at");
CREATE INDEX "idx_customers_user_email" ON "customers" ("user_id","email");
CREATE INDEX "idx_customers_user_id" ON "customers" ("user_id");
CREATE INDEX "idx_customers_user_phone" ON "customers" ("user_id","phone");
CREATE INDEX "idx_inventory_balances_location" ON "inventory_balances" ("location_id");
CREATE INDEX "idx_inventory_balances_user" ON "inventory_balances" ("user_id");
CREATE INDEX "idx_inventory_balances_variant" ON "inventory_balances" ("variant_id");
CREATE UNIQUE INDEX "inventory_balances_pkey" ON "inventory_balances" ("id");
CREATE UNIQUE INDEX "inventory_balances_unique_variant_location" ON "inventory_balances" ("location_id","variant_id");
CREATE INDEX "idx_inventory_locations_status" ON "inventory_locations" ("status");
CREATE INDEX "idx_inventory_locations_user" ON "inventory_locations" ("user_id");
CREATE UNIQUE INDEX "inventory_locations_pkey" ON "inventory_locations" ("id");
CREATE INDEX "idx_inventory_movements_created" ON "inventory_movements" ("created_at");
CREATE INDEX "idx_inventory_movements_location" ON "inventory_movements" ("location_id");
CREATE INDEX "idx_inventory_movements_reference" ON "inventory_movements" ("reference_type","reference_id");
CREATE INDEX "idx_inventory_movements_user" ON "inventory_movements" ("user_id");
CREATE INDEX "idx_inventory_movements_variant" ON "inventory_movements" ("variant_id");
CREATE UNIQUE INDEX "inventory_movements_pkey" ON "inventory_movements" ("id");
CREATE INDEX "idx_media_created" ON "media_library" ("created_at");
CREATE INDEX "idx_media_deleted" ON "media_library" ("deleted_at");
CREATE INDEX "idx_media_resource" ON "media_library" ("resource_type");
CREATE INDEX "idx_media_user" ON "media_library" ("user_id");
CREATE UNIQUE INDEX "media_library_pkey" ON "media_library" ("id");
CREATE UNIQUE INDEX "oauth_page_selections_pkey" ON "oauth_page_selections" ("id");
CREATE UNIQUE INDEX "order_addresses_pkey" ON "order_addresses" ("id");
CREATE INDEX "idx_order_external_references_order_id" ON "order_external_references" ("order_id");
CREATE INDEX "idx_order_external_references_source" ON "order_external_references" ("source");
CREATE UNIQUE INDEX "order_external_references_pkey" ON "order_external_references" ("id");
CREATE UNIQUE INDEX "order_external_references_source_external_order_id_key" ON "order_external_references" ("source","external_order_id");
CREATE INDEX "idx_order_inventory_allocations_location_id" ON "order_inventory_allocations" ("location_id");
CREATE INDEX "idx_order_inventory_allocations_order_id" ON "order_inventory_allocations" ("order_id");
CREATE INDEX "idx_order_inventory_allocations_order_item_id" ON "order_inventory_allocations" ("order_item_id");
CREATE INDEX "idx_order_inventory_allocations_status" ON "order_inventory_allocations" ("order_id","status");
CREATE UNIQUE INDEX "order_inventory_allocations_pkey" ON "order_inventory_allocations" ("id");
CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");
CREATE INDEX "idx_order_items_variant_id" ON "order_items" ("variant_id");
CREATE UNIQUE INDEX "order_items_pkey" ON "order_items" ("id");
CREATE INDEX "idx_order_payment_attempts_payment" ON "order_payment_attempts" ("payment_id");
CREATE INDEX "idx_order_payment_attempts_provider_payment" ON "order_payment_attempts" ("provider","provider_payment_id");
CREATE UNIQUE INDEX "order_payment_attempts_pkey" ON "order_payment_attempts" ("id");
CREATE UNIQUE INDEX "order_payment_attempts_provider_provider_payment_id_key" ON "order_payment_attempts" ("provider","provider_payment_id");
CREATE INDEX "idx_order_payments_order_id" ON "order_payments" ("order_id");
CREATE INDEX "idx_order_payments_status" ON "order_payments" ("order_id","status");
CREATE INDEX "idx_order_payments_transaction_id" ON "order_payments" ("transaction_id");
CREATE UNIQUE INDEX "order_payments_idempotency_key_unique" ON "order_payments" ("idempotency_key");
CREATE UNIQUE INDEX "order_payments_pkey" ON "order_payments" ("id");
CREATE INDEX "order_payments_provider_order_id_idx" ON "order_payments" ("provider","provider_order_id");
CREATE UNIQUE INDEX "order_refunds_idempotency_key_unique" ON "order_refunds" ("idempotency_key");
CREATE UNIQUE INDEX "order_refunds_pkey" ON "order_refunds" ("id");
CREATE INDEX "idx_order_return_items_order_item_id" ON "order_return_items" ("order_item_id");
CREATE INDEX "idx_order_return_items_return_id" ON "order_return_items" ("return_id");
CREATE UNIQUE INDEX "order_return_items_pkey" ON "order_return_items" ("id");
CREATE UNIQUE INDEX "order_return_items_return_id_order_item_id_key" ON "order_return_items" ("return_id","order_item_id");
CREATE INDEX "idx_order_returns_order_id" ON "order_returns" ("order_id");
CREATE INDEX "idx_order_returns_refund_id" ON "order_returns" ("refund_id");
CREATE INDEX "idx_order_returns_status" ON "order_returns" ("order_id","status");
CREATE UNIQUE INDEX "order_returns_pkey" ON "order_returns" ("id");
CREATE UNIQUE INDEX "uq_order_returns_refund_id" ON "order_returns" ("refund_id");
CREATE INDEX "idx_order_shipment_items_order_item_id" ON "order_shipment_items" ("order_item_id");
CREATE INDEX "idx_order_shipment_items_shipment_id" ON "order_shipment_items" ("shipment_id");
CREATE UNIQUE INDEX "order_shipment_items_pkey" ON "order_shipment_items" ("id");
CREATE UNIQUE INDEX "order_shipment_items_shipment_id_order_item_id_key" ON "order_shipment_items" ("shipment_id","order_item_id");
CREATE INDEX "idx_order_shipments_location_id" ON "order_shipments" ("location_id");
CREATE INDEX "idx_order_shipments_order_id" ON "order_shipments" ("order_id");
CREATE INDEX "idx_order_shipments_status" ON "order_shipments" ("order_id","status");
CREATE INDEX "idx_order_shipments_tracking_number" ON "order_shipments" ("tracking_number");
CREATE UNIQUE INDEX "order_shipments_pkey" ON "order_shipments" ("id");
CREATE INDEX "idx_order_status_history_created_at" ON "order_status_history" ("order_id","created_at");
CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history" ("order_id");
CREATE UNIQUE INDEX "order_status_history_pkey" ON "order_status_history" ("id");
CREATE INDEX "idx_order_taxes_order_id" ON "order_taxes" ("order_id");
CREATE UNIQUE INDEX "order_taxes_pkey" ON "order_taxes" ("id");
CREATE INDEX "idx_orders_customer_id" ON "orders" ("customer_id");
CREATE INDEX "idx_orders_source" ON "orders" ("user_id","source");
CREATE INDEX "idx_orders_user_created_at" ON "orders" ("user_id","created_at");
CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");
CREATE INDEX "idx_orders_user_status" ON "orders" ("user_id","order_status");
CREATE UNIQUE INDEX "orders_pkey" ON "orders" ("id");
CREATE UNIQUE INDEX "orders_user_id_order_number_key" ON "orders" ("user_id","order_number");
CREATE INDEX "idx_payment_webhook_events_provider_payment" ON "payment_webhook_events" ("provider","provider_payment_id");
CREATE INDEX "idx_payment_webhook_events_provider_refund" ON "payment_webhook_events" ("provider","provider_refund_id");
CREATE UNIQUE INDEX "payment_webhook_events_pkey" ON "payment_webhook_events" ("id");
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key" ON "payment_webhook_events" ("provider","provider_event_id");
CREATE UNIQUE INDEX "post_target_attempts_pkey" ON "post_target_attempts" ("id");
CREATE INDEX "idx_post_targets_account" ON "post_targets" ("social_account_id");
CREATE INDEX "idx_post_targets_post" ON "post_targets" ("post_id");
CREATE INDEX "idx_post_targets_status" ON "post_targets" ("status");
CREATE UNIQUE INDEX "post_targets_pkey" ON "post_targets" ("id");
CREATE UNIQUE INDEX "posts_pkey" ON "posts" ("id");
CREATE INDEX "idx_product_listing_media_listing" ON "product_listing_media" ("listing_id");
CREATE INDEX "idx_product_listing_media_product_media" ON "product_listing_media" ("product_media_id");
CREATE INDEX "idx_product_listing_media_sync_status" ON "product_listing_media" ("sync_status");
CREATE UNIQUE INDEX "product_listing_media_pkey" ON "product_listing_media" ("id");
CREATE UNIQUE INDEX "unique_listing_media" ON "product_listing_media" ("listing_id","product_media_id");
CREATE INDEX "idx_product_listing_variants_listing" ON "product_listing_variants" ("listing_id");
CREATE INDEX "idx_product_listing_variants_sync_status" ON "product_listing_variants" ("sync_status");
CREATE INDEX "idx_product_listing_variants_variant" ON "product_listing_variants" ("variant_id");
CREATE UNIQUE INDEX "product_listing_variants_pkey" ON "product_listing_variants" ("id");
CREATE UNIQUE INDEX "unique_listing_variant" ON "product_listing_variants" ("listing_id","variant_id");
CREATE INDEX "idx_product_listings_channel" ON "product_listings" ("channel_id");
CREATE INDEX "idx_product_listings_product" ON "product_listings" ("product_id");
CREATE INDEX "idx_product_listings_sync_status" ON "product_listings" ("sync_status");
CREATE INDEX "idx_product_listings_user" ON "product_listings" ("user_id");
CREATE UNIQUE INDEX "product_listings_pkey" ON "product_listings" ("id");
CREATE UNIQUE INDEX "unique_product_listing_channel" ON "product_listings" ("product_id","channel_id");
CREATE INDEX "idx_product_media_media" ON "product_media" ("media_id");
CREATE INDEX "idx_product_media_product" ON "product_media" ("product_id");
CREATE UNIQUE INDEX "product_media_pkey" ON "product_media" ("id");
CREATE UNIQUE INDEX "unique_product_media" ON "product_media" ("product_id","media_id");
CREATE INDEX "idx_product_variants_product" ON "product_variants" ("product_id");
CREATE UNIQUE INDEX "product_variants_pkey" ON "product_variants" ("id");
CREATE UNIQUE INDEX "unique_product_variant_sku" ON "product_variants" ("sku");
CREATE INDEX "idx_products_status" ON "products" ("status");
CREATE INDEX "idx_products_user" ON "products" ("user_id");
CREATE UNIQUE INDEX "products_pkey" ON "products" ("id");
CREATE UNIQUE INDEX "publish_logs_pkey" ON "publish_logs" ("id");
CREATE UNIQUE INDEX "scheduler_heartbeat_pkey" ON "scheduler_heartbeat" ("id");
CREATE UNIQUE INDEX "schema_migrations_pkey" ON "schema_migrations" ("version");
CREATE INDEX "idx_social_accounts_last_checked" ON "social_accounts" ("last_checked_at");
CREATE UNIQUE INDEX "social_accounts_pkey" ON "social_accounts" ("id");
CREATE UNIQUE INDEX "unique_user_page_platform" ON "social_accounts" ("user_id","page_id","platform");
CREATE INDEX "idx_subscriptions_provider_subscription" ON "subscriptions" ("provider_subscription_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" ("status");
CREATE INDEX "idx_subscriptions_user" ON "subscriptions" ("user_id");
CREATE UNIQUE INDEX "subscriptions_pkey" ON "subscriptions" ("id");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions" ("provider_subscription_id");
CREATE UNIQUE INDEX "system_events_pkey" ON "system_events" ("id");
CREATE UNIQUE INDEX "user_usage_pkey" ON "user_usage" ("id");
CREATE UNIQUE INDEX "user_usage_user_id_year_month_key" ON "user_usage" ("user_id","year","month");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");

-- Foreign keys
ALTER TABLE "amazon_channel_credentials" ADD CONSTRAINT "amazon_channel_credentials_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "commerce_channels"("id") ON DELETE CASCADE;
ALTER TABLE "commerce_channel_credentials" ADD CONSTRAINT "commerce_channel_credentials_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "commerce_channels"("id") ON DELETE CASCADE;
ALTER TABLE "commerce_channels" ADD CONSTRAINT "commerce_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE;
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE;
ALTER TABLE "media_library" ADD CONSTRAINT "media_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_external_references" ADD CONSTRAINT "order_external_references_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_inventory_allocations" ADD CONSTRAINT "order_inventory_allocations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT;
ALTER TABLE "order_inventory_allocations" ADD CONSTRAINT "order_inventory_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_inventory_allocations" ADD CONSTRAINT "order_inventory_allocations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT;
ALTER TABLE "order_payment_attempts" ADD CONSTRAINT "order_payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "order_payments"("id") ON DELETE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "order_payments"("id") ON DELETE RESTRICT;
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT;
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "order_returns"("id") ON DELETE CASCADE;
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL;
ALTER TABLE "order_shipment_items" ADD CONSTRAINT "order_shipment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE;
ALTER TABLE "order_shipment_items" ADD CONSTRAINT "order_shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "order_shipments"("id") ON DELETE CASCADE;
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE SET NULL;
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_taxes" ADD CONSTRAINT "order_taxes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "order_payments"("id") ON DELETE SET NULL;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL;
ALTER TABLE "post_target_attempts" ADD CONSTRAINT "post_target_attempts_post_target_id_fkey" FOREIGN KEY ("post_target_id") REFERENCES "post_targets"("id") ON DELETE CASCADE;
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE;
ALTER TABLE "product_listing_media" ADD CONSTRAINT "product_listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "product_listings"("id") ON DELETE CASCADE;
ALTER TABLE "product_listing_media" ADD CONSTRAINT "product_listing_media_product_media_id_fkey" FOREIGN KEY ("product_media_id") REFERENCES "product_media"("id") ON DELETE CASCADE;
ALTER TABLE "product_listing_variants" ADD CONSTRAINT "product_listing_variants_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "product_listings"("id") ON DELETE CASCADE;
ALTER TABLE "product_listing_variants" ADD CONSTRAINT "product_listing_variants_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE;
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "commerce_channels"("id") ON DELETE CASCADE;
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_library"("id") ON DELETE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
