import crypto from "node:crypto";
import { pool } from "@/lib/db";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

type StoredCredential = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getEncryptionKey() {
  const raw = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("SHOPIFY_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error("SHOPIFY_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }

  return key;
}

function encrypt(value: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: StoredCredential = {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
  };

  return JSON.stringify(payload);
}

function decrypt(value: string): string {
  const payload = JSON.parse(value) as StoredCredential;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export interface SaveShopifyCredentialsInput {
  channelId: string;
  userId: number;
  accessToken: string;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scopes?: string | null;
}

export async function saveShopifyCredentials(input: SaveShopifyCredentialsInput) {
  const channelResult = await pool.query(
    `
    SELECT id
    FROM commerce_channels
    WHERE id = $1 AND user_id = $2 AND provider = 'shopify'
    LIMIT 1
    `,
    [input.channelId, input.userId],
  );
  if (!channelResult.rows[0]) {
    throw new Error("SHOPIFY_CHANNEL_NOT_FOUND");
  }

  const result = await pool.query(
    `
    INSERT INTO commerce_channel_credentials
      (
        channel_id,
        access_token_encrypted,
        refresh_token_encrypted,
        access_token_expires_at,
        refresh_token_expires_at,
        scopes
      )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (channel_id)
    DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      access_token_expires_at = EXCLUDED.access_token_expires_at,
      refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
      scopes = EXCLUDED.scopes,
      updated_at = now()
    RETURNING channel_id, access_token_expires_at, refresh_token_expires_at, scopes, updated_at
    `,
    [
      input.channelId,
      encrypt(input.accessToken),
      input.refreshToken ? encrypt(input.refreshToken) : null,
      input.accessTokenExpiresAt ?? null,
      input.refreshTokenExpiresAt ?? null,
      input.scopes ?? null,
    ],
  );

  return result.rows[0];
}

export async function getShopifyCredentials(channelId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      ccc.channel_id,
      ccc.access_token_encrypted,
      ccc.refresh_token_encrypted,
      ccc.access_token_expires_at,
      ccc.refresh_token_expires_at,
      ccc.scopes
    FROM commerce_channel_credentials ccc
    INNER JOIN commerce_channels cc
      ON cc.id = ccc.channel_id
     AND cc.user_id = $2
     AND cc.provider = 'shopify'
    WHERE ccc.channel_id = $1
    LIMIT 1
    `,
    [channelId, userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    channelId: String(row.channel_id),
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted
      ? decrypt(row.refresh_token_encrypted)
      : null,
    accessTokenExpiresAt: row.access_token_expires_at
      ? new Date(row.access_token_expires_at)
      : null,
    refreshTokenExpiresAt: row.refresh_token_expires_at
      ? new Date(row.refresh_token_expires_at)
      : null,
    scopes: row.scopes as string | null,
  };
}
