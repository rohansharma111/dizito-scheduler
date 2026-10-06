import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { pool } from "@/lib/db";
import { getFlipkartCredentials, saveFlipkartCredentials } from "@/lib/platforms/flipkart/credentials";
import { refreshFlipkartAccessToken } from "@/lib/platforms/flipkart/token-refresh";

const EXPIRY_SKEW_MS = 60_000;

export type FlipkartRefreshEnvironment = "sandbox" | "production";

function normalizeEnvironment(value: unknown): FlipkartRefreshEnvironment {
  return value === "sandbox" ? "sandbox" : "production";
}

function needsAccessTokenRefresh(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) {
    throw new Error("Flipkart access token expiry is invalid");
  }
  return expiry <= Date.now() + EXPIRY_SKEW_MS;
}

function createBasicAuthorization(appId?: string, appSecret?: string) {
  if (!appId?.trim() || !appSecret?.trim()) {
    throw new Error("Flipkart application credentials are required for token refresh");
  }
  return `Basic ${Buffer.from(`${appId}:${appSecret}`, "utf8").toString("base64")}`;
}

export async function refreshFlipkartCredentials(
  channelId: string,
  userId: number,
) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel || channel.provider !== "flipkart") {
    throw new Error("Flipkart channel not found");
  }
  if (channel.status !== "active") {
    throw new Error(`Flipkart channel is not active (status: ${channel.status})`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [channelId]);

    const credentials = await getFlipkartCredentials(channelId, userId);
    if (!credentials) {
      throw new Error("Flipkart credentials not found");
    }

    if (!needsAccessTokenRefresh(credentials.accessTokenExpiresAt)) {
      await client.query("COMMIT");
      return credentials;
    }

    if (!credentials.refreshToken) {
      throw new Error("Flipkart refresh token is not available");
    }

    if (
      credentials.refreshTokenExpiresAt &&
      needsAccessTokenRefresh(credentials.refreshTokenExpiresAt)
    ) {
      throw new Error("Flipkart refresh token is expired or nearing expiry; reauthorization is required");
    }

    const metadata = (channel.metadata ?? {}) as Record<string, unknown>;
    const environment = normalizeEnvironment(metadata.flipkartEnvironment);
    const authorizationHeader = createBasicAuthorization(
      credentials.appId,
      credentials.appSecret,
    );

    const refreshed = await refreshFlipkartAccessToken({
      environment,
      refreshToken: credentials.refreshToken,
      authorizationHeader,
    });

    await saveFlipkartCredentials({
      channelId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      appId: credentials.appId,
      appSecret: credentials.appSecret,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
    }, client);

    await client.query("COMMIT");

    return {
      ...credentials,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
