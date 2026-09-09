import crypto from "node:crypto";

const STATE_COOKIE = "dizito_amazon_oauth_state";
const DEFAULT_MARKETPLACE_ID = "A21TJRUUN4KGV";
const DEFAULT_SELLER_CENTRAL_URL = "https://sellercentral.amazon.in";
const DEFAULT_SP_API_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";
const DEFAULT_LWA_ENDPOINT = "https://api.amazon.com/auth/o2/token";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getAmazonApplicationId() {
  return requiredEnv("AMAZON_SP_API_APPLICATION_ID");
}

export function getAmazonMarketplaceId() {
  return process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_ID;
}

export function getAmazonSellerCentralUrl() {
  return process.env.AMAZON_SELLER_CENTRAL_URL || DEFAULT_SELLER_CENTRAL_URL;
}

export function getAmazonSpApiEndpoint() {
  return process.env.AMAZON_SP_API_ENDPOINT || DEFAULT_SP_API_ENDPOINT;
}

export function getAmazonLwaEndpoint() {
  return process.env.AMAZON_LWA_ENDPOINT || DEFAULT_LWA_ENDPOINT;
}

export function getAmazonRedirectUri() {
  const appUrl = process.env.AMAZON_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) throw new Error("AMAZON_APP_URL or NEXTAUTH_URL is not configured");
  return new URL("/api/commerce/amazon/callback", appUrl).toString();
}

function getStateSecret() {
  return requiredEnv("AMAZON_SP_API_CLIENT_SECRET");
}

export function createAmazonOAuthState(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(24).toString("base64url"),
      userId,
      exp: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");

  const signature = crypto.createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAmazonOAuthState(state: string, userId: number) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expected = crypto.createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: number;
      exp?: number;
    };
    return parsed.userId === userId && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function getAmazonStateCookieName() {
  return STATE_COOKIE;
}

export function buildAmazonAuthorizationUrl(state: string) {
  const url = new URL(`${getAmazonSellerCentralUrl().replace(/\/$/, "")}/apps/authorize/consent`);
  url.searchParams.set("application_id", getAmazonApplicationId());
  url.searchParams.set("state", state);

  if (process.env.AMAZON_APP_DRAFT === "true") {
    url.searchParams.set("version", "beta");
  }

  return url;
}

export interface AmazonLwaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export async function exchangeAmazonAuthorizationCode(code: string): Promise<AmazonLwaTokenResponse> {
  const response = await fetch(getAmazonLwaEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getAmazonRedirectUri(),
      client_id: requiredEnv("AMAZON_SP_API_CLIENT_ID"),
      client_secret: requiredEnv("AMAZON_SP_API_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });

  const body = (await response.json()) as Partial<AmazonLwaTokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !body.refresh_token) {
    throw new Error(
      body.error_description || body.error || "Amazon authorization code exchange failed",
    );
  }

  return {
    access_token: body.access_token || "",
    token_type: body.token_type || "bearer",
    expires_in: body.expires_in || 0,
    refresh_token: body.refresh_token,
    refresh_token_expires_in: body.refresh_token_expires_in,
  };
}

export async function refreshAmazonAccessToken(refreshToken: string) {
  const response = await fetch(getAmazonLwaEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: requiredEnv("AMAZON_SP_API_CLIENT_ID"),
      client_secret: requiredEnv("AMAZON_SP_API_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });

  const body = (await response.json()) as Partial<AmazonLwaTokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "Amazon access token refresh failed");
  }

  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in || 0,
  };
}
