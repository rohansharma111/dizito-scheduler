import crypto from "node:crypto";
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
  accessToken: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
}

export async function saveFlipkartCredentials(input: FlipkartCredentials) {
  const payload = JSON.stringify({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    appId: input.appId,
    appSecret: input.appSecret,
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
    [input.channelId, encrypt(payload), "flipkart:Seller_Api"],
  );
}

export async function getFlipkartCredentials(channelId: string) {
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
  };
}
