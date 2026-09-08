import crypto from "node:crypto";

const STATE_COOKIE = "dizito_shopify_oauth_state";
const DEFAULT_API_VERSION = "2026-07";
const DEFAULT_SCOPES = "read_products,write_products";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getShopifyApiVersion() {
  return process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
}

export function getShopifyScopes() {
  return process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES;
}

export function getShopifyRedirectUri() {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) throw new Error("SHOPIFY_APP_URL or NEXTAUTH_URL is not configured");

  return new URL("/api/commerce/shopify/callback", appUrl).toString();
}

function getStateSecret() {
  return requiredEnv("SHOPIFY_CLIENT_SECRET");
}

export function normalizeShopDomain(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
    throw new Error("Shopify shop must be a valid *.myshopify.com domain");
  }

  return normalized;
}

function signState(payload: string) {
  return crypto
    .createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");
}

export function createOAuthState() {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(24).toString("base64url"),
      exp: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${signState(payload)}`;
}

export function verifyOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expected = signState(payload);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(provided, expectedBuffer)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function getShopifyStateCookieName() {
  return STATE_COOKIE;
}

export function buildShopifyAuthorizationUrl(shop: string, state: string) {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", requiredEnv("SHOPIFY_CLIENT_ID"));
  url.searchParams.set("scope", getShopifyScopes());
  url.searchParams.set("redirect_uri", getShopifyRedirectUri());
  url.searchParams.set("state", state);
  return url;
}

export interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export async function exchangeShopifyAuthorizationCode(shop: string, code: string) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requiredEnv("SHOPIFY_CLIENT_ID"),
      client_secret: requiredEnv("SHOPIFY_CLIENT_SECRET"),
      code,
      expiring: "1",
    }),
    cache: "no-store",
  });

  const body = (await response.json()) as
    | ShopifyTokenResponse
    | { error?: string; error_description?: string };

  if (!response.ok || !("access_token" in body) || !body.access_token) {
    const detail = "error_description" in body ? body.error_description : undefined;
    throw new Error(
      detail ||
        ("error" in body ? body.error : undefined) ||
        "Shopify token exchange failed",
    );
  }

  return body;
}
