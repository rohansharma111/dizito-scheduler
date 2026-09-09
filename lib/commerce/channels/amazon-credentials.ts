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
  const raw = process.env.AMAZON_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("AMAZON_TOKEN_ENCRYPTION_KEY is not configured");

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("AMAZON_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
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

export interface SaveAmazonCredentialsInput {
  channelId: string;
  refreshToken: string;
  refreshTokenExpiresAt?: Date | null;
  scopes?: string | null;
}

export async function saveAmazonCredentials(input: SaveAmazonCredentialsInput) {
  const result = await pool.query(
    `
    INSERT INTO amazon_channel_credentials
      (channel_id, refresh_token_encrypted, refresh_token_expires_at, scopes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (channel_id)
    DO UPDATE SET
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
      scopes = EXCLUDED.scopes,
      updated_at = now()
    RETURNING channel_id, refresh_token_expires_at, scopes, updated_at
    `,
    [
      input.channelId,
      encrypt(input.refreshToken),
      input.refreshTokenExpiresAt ?? null,
      input.scopes ?? null,
    ],
  );

  return result.rows[0];
}

export async function getAmazonCredentials(channelId: string) {
  const result = await pool.query(
    `
    SELECT channel_id, refresh_token_encrypted, refresh_token_expires_at, scopes
    FROM amazon_channel_credentials
    WHERE channel_id = $1
    LIMIT 1
    `,
    [channelId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    channelId: String(row.channel_id),
    refreshToken: decrypt(row.refresh_token_encrypted),
    refreshTokenExpiresAt: row.refresh_token_expires_at
      ? new Date(row.refresh_token_expires_at)
      : null,
    scopes: row.scopes as string | null,
  };
}
