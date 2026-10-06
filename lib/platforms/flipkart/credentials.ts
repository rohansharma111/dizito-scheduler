import crypto from "node:crypto";
import { type PoolClient } from "pg";
import { pool } from "@/lib/db";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getEncryptionKey() {
  const raw = process.env.FLIPKART_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("FLIPKART_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("Flipkart token encryption key must decode to 32 bytes");
  }
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

export interface FlipkartCredentials {
  channelId: string;
  userId: number;
  accessToken: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
  accessTokenExpiresAt?: Date | string | null;
  refreshTokenExpiresAt?: Date | string | null;
}

function normalizeExpiry(value?: Date | string | null) {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Flipkart credential expiry must be a valid date");
  }
  return date.toISOString();
}

export async function saveFlipkartCredentials(
  input: FlipkartCredentials,
  db: typeof pool | PoolClient = pool,
) {
  const payload = JSON.stringify({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    appId: input.appId,
    appSecret: input.appSecret,
  });

  const result = await db.query(
    `
      INSERT INTO commerce_channel_credentials (
        channel_id,
        access_token_encrypted,
        access_token_expires_at,
        refresh_token_expires_at,
        scopes
      )
      SELECT c.id, $2, $3, $4, $5
      FROM commerce_channels c
      WHERE c.id = $1
        AND c.user_id = $6
        AND c.provider = 'flipkart'
      ON CONFLICT (channel_id)
      DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        access_token_expires_at = EXCLUDED.access_token_expires_at,
        refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
        scopes = EXCLUDED.scopes,
        updated_at = now()
      RETURNING channel_id
    `,
    [
      input.channelId,
      encrypt(payload),
      normalizeExpiry(input.accessTokenExpiresAt),
      normalizeExpiry(input.refreshTokenExpiresAt),
      "flipkart:Seller_Api",
      input.userId,
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Flipkart channel not found for this user");
  }
}

export async function getFlipkartCredentials(channelId: string, userId: number) {
  const result = await pool.query(
    `
      SELECT
        access_token_encrypted,
        access_token_expires_at,
        refresh_token_expires_at
      FROM commerce_channel_credentials
      WHERE channel_id = $1
        AND EXISTS (
          SELECT 1
          FROM commerce_channels c
          WHERE c.id = $1
            AND c.user_id = $2
            AND c.provider = 'flipkart'
        )
      LIMIT 1
    `,
    [channelId, userId],
  );

  const row = result.rows[0];
  if (!row?.access_token_encrypted) return null;

  const parsed = JSON.parse(decrypt(row.access_token_encrypted)) as {
    accessToken?: string;
    refreshToken?: string;
    appId?: string;
    appSecret?: string;
  };

  if (!parsed.accessToken) return null;
  return {
    channelId,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    appId: parsed.appId,
    appSecret: parsed.appSecret,
    accessTokenExpiresAt: row.access_token_expires_at,
    refreshTokenExpiresAt: row.refresh_token_expires_at,
  };
}
