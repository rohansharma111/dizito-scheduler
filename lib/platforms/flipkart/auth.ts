import crypto from "node:crypto";

const STATE_COOKIE = "dizito_flipkart_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_BASE_URLS = {
  sandbox: "https://sandbox-api.flipkart.net",
  production: "https://api.flipkart.net",
} as const;

export type FlipkartOAuthEnvironment = keyof typeof TOKEN_BASE_URLS;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getFlipkartOAuthEnvironment(): FlipkartOAuthEnvironment {
  return process.env.FLIPKART_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
}

export function getFlipkartClientId() {
  return requiredEnv("FLIPKART_CLIENT_ID");
}

export function getFlipkartClientSecret() {
  return requiredEnv("FLIPKART_CLIENT_SECRET");
}

export function getFlipkartRedirectUri() {
  const configured = process.env.FLIPKART_REDIRECT_URI;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:") {
      throw new Error("FLIPKART_REDIRECT_URI must use HTTPS");
    }
    return url.toString();
  }

  const appUrl = process.env.NEXTAUTH_URL;
  if (!appUrl) throw new Error("FLIPKART_REDIRECT_URI or NEXTAUTH_URL is not configured");

  const url = new URL("/api/commerce/flipkart/callback", appUrl);
  if (url.protocol !== "https:") {
    throw new Error("Flipkart OAuth callback requires an HTTPS redirect URI");
  }
  return url.toString();
}

function getStateSecret() {
  return requiredEnv("FLIPKART_CLIENT_SECRET");
}

export function createOAuthState(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(24).toString("base64url"),
      userId,
      exp: Date.now() + STATE_TTL_MS,
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string, userId: number) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expected = crypto
    .createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");

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

    return (
      parsed.userId === userId &&
      typeof parsed.exp === "number" &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export function getFlipkartStateCookieName() {
  return STATE_COOKIE;
}

export function buildFlipkartAuthorizationUrl(state: string) {
  const environment = getFlipkartOAuthEnvironment();
  const url = new URL(
    `${TOKEN_BASE_URLS[environment]}/oauth-service/oauth/authorize`,
  );

  url.searchParams.set("client_id", getFlipkartClientId());
  url.searchParams.set("redirect_uri", getFlipkartRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "Seller_Api");
  url.searchParams.set("state", state);

  return url;
}

export interface FlipkartAuthorizationTokenResponse {
  access_token: string;
  token_type?: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  refresh_token_expires_in: number;
}

export async function exchangeFlipkartAuthorizationCode(
  code: string,
  state: string,
) {
  if (!code.trim() || !state.trim()) {
    throw new Error("Flipkart authorization response is incomplete");
  }

  const environment = getFlipkartOAuthEnvironment();
  const query = new URLSearchParams({
    redirect_uri: getFlipkartRedirectUri(),
    grant_type: "authorization_code",
    state,
    code,
  });

  const authorization = Buffer.from(
    `${getFlipkartClientId()}:${getFlipkartClientSecret()}`,
    "utf8",
  ).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(
      `${TOKEN_BASE_URLS[environment]}/oauth-service/oauth/token?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authorization}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new Error(`Flipkart authorization exchange failed with status ${response.status}`);
    }

    const token = body as Partial<FlipkartAuthorizationTokenResponse> | null;
    if (
      typeof token?.access_token !== "string" ||
      typeof token.refresh_token !== "string" ||
      typeof token.expires_in !== "number" ||
      typeof token.refresh_token_expires_in !== "number"
    ) {
      throw new Error("Flipkart authorization exchange returned an invalid token response");
    }

    return token as FlipkartAuthorizationTokenResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Flipkart authorization exchange timed out after 15000ms");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
