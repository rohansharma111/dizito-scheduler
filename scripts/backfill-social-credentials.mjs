import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const LOCK_ID = 918273646;

function getEncryptionKey() {
  const raw = process.env.SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY is required");
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new Error("SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

function encrypt(value, key) {
  if (typeof value !== "string" || value.length === 0) return null;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({
    v: VERSION,
    alg: ALGORITHM,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  });
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const key = getEncryptionKey();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
  await client.query("BEGIN");

  const social = await client.query(`
    SELECT id, access_token, page_access_token, refresh_token,
           access_token_encrypted, page_access_token_encrypted, refresh_token_encrypted
    FROM social_accounts
    WHERE (access_token IS NOT NULL AND access_token_encrypted IS NULL)
       OR (page_access_token IS NOT NULL AND page_access_token_encrypted IS NULL)
       OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL)
    ORDER BY id
    FOR UPDATE
  `);

  let socialUpdated = 0;
  for (const row of social.rows) {
    const accessTokenEncrypted = !row.access_token_encrypted && row.access_token
      ? encrypt(row.access_token, key) : row.access_token_encrypted;
    const pageAccessTokenEncrypted = !row.page_access_token_encrypted && row.page_access_token
      ? encrypt(row.page_access_token, key) : row.page_access_token_encrypted;
    const refreshTokenEncrypted = !row.refresh_token_encrypted && row.refresh_token
      ? encrypt(row.refresh_token, key) : row.refresh_token_encrypted;

    await client.query(
      `UPDATE social_accounts
       SET access_token_encrypted = $1,
           page_access_token_encrypted = $2,
           refresh_token_encrypted = $3,
           credential_encryption_version = CASE
             WHEN $1 IS NOT NULL OR $2 IS NOT NULL OR $3 IS NOT NULL THEN 'v1'
             ELSE credential_encryption_version
           END
       WHERE id = $4`,
      [accessTokenEncrypted, pageAccessTokenEncrypted, refreshTokenEncrypted, row.id],
    );
    socialUpdated += 1;
  }

  const selections = await client.query(`
    SELECT id, access_token, refresh_token, pages,
           access_token_encrypted, refresh_token_encrypted, pages_encrypted
    FROM oauth_page_selections
    WHERE (access_token IS NOT NULL AND access_token_encrypted IS NULL)
       OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL)
       OR (pages IS NOT NULL AND pages_encrypted IS NULL)
    ORDER BY id
    FOR UPDATE
  `);

  let selectionsUpdated = 0;
  for (const row of selections.rows) {
    const accessTokenEncrypted = !row.access_token_encrypted && row.access_token
      ? encrypt(row.access_token, key) : row.access_token_encrypted;
    const refreshTokenEncrypted = !row.refresh_token_encrypted && row.refresh_token
      ? encrypt(row.refresh_token, key) : row.refresh_token_encrypted;
    const pagesEncrypted = !row.pages_encrypted && row.pages
      ? encrypt(typeof row.pages === "string" ? row.pages : JSON.stringify(row.pages), key)
      : row.pages_encrypted;

    await client.query(
      `UPDATE oauth_page_selections
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           pages_encrypted = $3,
           credential_encryption_version = CASE
             WHEN $1 IS NOT NULL OR $2 IS NOT NULL OR $3 IS NOT NULL THEN 'v1'
             ELSE credential_encryption_version
           END
       WHERE id = $4`,
      [accessTokenEncrypted, refreshTokenEncrypted, pagesEncrypted, row.id],
    );
    selectionsUpdated += 1;
  }

  await client.query("COMMIT");

  const verification = await client.query(`
    SELECT
      (SELECT count(*) FROM social_accounts WHERE
        (access_token IS NOT NULL AND access_token_encrypted IS NULL)
        OR (page_access_token IS NOT NULL AND page_access_token_encrypted IS NULL)
        OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL)) AS social_remaining,
      (SELECT count(*) FROM oauth_page_selections WHERE
        (access_token IS NOT NULL AND access_token_encrypted IS NULL)
        OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL)
        OR (pages IS NOT NULL AND pages_encrypted IS NULL)) AS selection_remaining
  `);

  const socialRemaining = Number(verification.rows[0].social_remaining);
  const selectionRemaining = Number(verification.rows[0].selection_remaining);
  if (socialRemaining !== 0 || selectionRemaining !== 0) {
    throw new Error(
      "Backfill incomplete: social_accounts=" + socialRemaining +
      ", oauth_page_selections=" + selectionRemaining,
    );
  }

  console.log(
    "Social credential backfill complete: social_accounts=" + socialUpdated +
    ", oauth_page_selections=" + selectionsUpdated,
  );
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  throw error;
} finally {
  try { await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]); }
  finally { client.release(); await pool.end(); }
}
