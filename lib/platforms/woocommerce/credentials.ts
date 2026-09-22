import crypto from "node:crypto";
import { pool } from "@/lib/db";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getEncryptionKey() {
  const raw = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("SHOPIFY_TOKEN_ENCRYPTION_KEY is not configured");

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new Error("SHOPIFY_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  });
}

function decrypt(value: string) {
  const payload = JSON.parse(value) as { ciphertext: string; iv: string; tag: string };
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export interface WooCommerceCredentials {
  channelId: string;
  consumerKey: string;
  consumerSecret: string;
}

export async function saveWooCommerceCredentials(input: WooCommerceCredentials) {
  const payload = JSON.stringify({
    consumerKey: input.consumerKey,
    consumerSecret: input.consumerSecret,
  });

  await pool.query(
    `
      INSERT INTO commerce_channel_credentials (channel_id, access_token_encrypted, scopes)
      VALUES ($1, $2, $3)
      ON CONFLICT (channel_id)
      DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        scopes = EXCLUDED.scopes,
        updated_at = now()
    `,
    [input.channelId, encrypt(payload), "woocommerce:consumer_credentials"],
  );
}

export async function getWooCommerceCredentials(channelId: string) {
  const result = await pool.query(
    `
      SELECT access_token_encrypted
      FROM commerce_channel_credentials
      WHERE channel_id = $1
      LIMIT 1
    `,
    [channelId],
  );

  const row = result.rows[0];
  if (!row?.access_token_encrypted) return null;

  const parsed = JSON.parse(decrypt(row.access_token_encrypted)) as {
    consumerKey?: string;
    consumerSecret?: string;
  };

  if (!parsed.consumerKey || !parsed.consumerSecret) return null;
  return {
    channelId,
    consumerKey: parsed.consumerKey,
    consumerSecret: parsed.consumerSecret,
  };
}
