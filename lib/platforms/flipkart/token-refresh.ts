import type { FlipkartEnvironment } from "./credentials";

const TOKEN_BASE_URLS: Record<FlipkartEnvironment, string> = {
  sandbox: "https://sandbox-api.flipkart.net",
  production: "https://api.flipkart.net",
};

const REFRESH_TIMEOUT_MS = 15_000;

export interface FlipkartTokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

function expiryFromSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Flipkart token response contained an invalid expiry");
  }
  return new Date(Date.now() + value * 1000);
}

export async function refreshFlipkartAccessToken(input: {
  environment: FlipkartEnvironment;
  refreshToken: string;
  authorizationHeader: string;
}): Promise<FlipkartTokenRefreshResult> {
  if (!input.refreshToken.trim()) {
    throw new Error("Flipkart refresh token is required");
  }
  if (!input.authorizationHeader.startsWith("Basic ")) {
    throw new Error("Flipkart token refresh requires Basic authorization");
  }

  const query = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${TOKEN_BASE_URLS[input.environment]}/oauth-service/oauth/token?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: input.authorizationHeader,
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
      throw new Error(`Flipkart token refresh failed with status ${response.status}`);
    }

    const tokenResponse = body as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
      refresh_token_expires_in?: unknown;
    } | null;

    if (
      typeof tokenResponse?.access_token !== "string" ||
      typeof tokenResponse.refresh_token !== "string"
    ) {
      throw new Error("Flipkart token refresh returned an invalid token response");
    }

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accessTokenExpiresAt: expiryFromSeconds(tokenResponse.expires_in),
      refreshTokenExpiresAt: expiryFromSeconds(tokenResponse.refresh_token_expires_in),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Flipkart token refresh timed out after ${REFRESH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
