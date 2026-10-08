import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

type EncryptedSocialCredential = {
  v: typeof VERSION;
  alg: typeof ALGORITHM;
  iv: string;
  tag: string;
  ciphertext: string;
};

function getEncryptionKey(): Buffer {
  const raw = process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error(
      "SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY must decode to 32 bytes",
    );
  }

  return key;
}

export function encryptSocialCredential(value: string): string {
  if (!value) {
    throw new Error("Cannot encrypt an empty social credential");
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const payload: EncryptedSocialCredential = {
    v: VERSION,
    alg: ALGORITHM,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };

  return JSON.stringify(payload);
}

export function decryptSocialCredential(value: string): string {
  const payload = JSON.parse(value) as Partial<EncryptedSocialCredential>;

  if (
    payload.v !== VERSION ||
    payload.alg !== ALGORITHM ||
    typeof payload.iv !== "string" ||
    typeof payload.tag !== "string" ||
    typeof payload.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted social credential");
  }

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

export function isEncryptedSocialCredential(value: string): boolean {
  try {
    const payload = JSON.parse(value) as Partial<EncryptedSocialCredential>;
    return (
      payload.v === VERSION &&
      payload.alg === ALGORITHM &&
      typeof payload.iv === "string" &&
      typeof payload.tag === "string" &&
      typeof payload.ciphertext === "string"
    );
  } catch {
    return false;
  }
}
