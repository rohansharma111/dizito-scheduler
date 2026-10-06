import { getCommerceChannelById, updateCommerceChannel } from "@/lib/commerce/channels/service";
import {
  getShopifyCredentials,
  saveShopifyCredentials,
} from "@/lib/commerce/channels/credentials";
import { getShopifyApiVersion } from "@/lib/platforms/shopify/auth";

interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface ShopifyRefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

function getClientCredentials() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(
  shop: string,
  refreshToken: string,
): Promise<ShopifyRefreshTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    error?: string;
  };

  if (!response.ok || !body.access_token || !body.refresh_token) {
    throw new Error(body.error || "Shopify access token refresh failed");
  }

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
    refresh_token_expires_in: body.refresh_token_expires_in,
  };
}

async function markShopifyChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, {
    status: "error",
    metadata: {
      shopifyHealth: {
        status: "error",
        message,
        updatedAt: new Date().toISOString(),
      },
    },
  }).catch((statusError) => {
    console.error("Unable to mark Shopify channel as error:", statusError);
  });
}

async function getAccessToken(channelId: string, userId: number) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel || channel.provider !== "shopify") {
    throw new Error("Shopify channel not found");
  }

  if (channel.status !== "active") {
    throw new Error(`Shopify channel is not active (status: ${channel.status})`);
  }

  const credentials = await getShopifyCredentials(channelId, userId);
  if (!credentials) {
    await markShopifyChannelError(
      channelId,
      Number(channel.user_id),
      "Shopify credentials not found",
    );
    throw new Error("Shopify credentials not found");
  }

  const expiresSoon =
    credentials.accessTokenExpiresAt &&
    credentials.accessTokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return { channel, accessToken: credentials.accessToken };
  }

  if (!credentials.refreshToken) {
    const message = "Shopify access token expired and no refresh token is available";
    await markShopifyChannelError(channelId, Number(channel.user_id), message);
    throw new Error(message);
  }

  let refreshed: ShopifyRefreshTokenResponse;
  try {
    refreshed = await refreshAccessToken(
      String(channel.external_account_id),
      credentials.refreshToken,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify access token refresh failed";
    await markShopifyChannelError(channelId, Number(channel.user_id), message);
    throw error instanceof Error ? error : new Error(message);
  }

  await saveShopifyCredentials({
    channelId,
    userId,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    accessTokenExpiresAt: refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : null,
    refreshTokenExpiresAt: refreshed.refresh_token_expires_in
      ? new Date(Date.now() + refreshed.refresh_token_expires_in * 1000)
      : credentials.refreshTokenExpiresAt,
    scopes: credentials.scopes,
  });

  return { channel, accessToken: refreshed.access_token };
}

export async function shopifyGraphQL<T>(
  channelId: string,
  userId: number,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { channel, accessToken } = await getAccessToken(channelId, userId);
  const shop = String(channel.external_account_id);
  const apiVersion = getShopifyApiVersion();

  const response = await fetch(
    `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  const body = (await response.json()) as ShopifyGraphQLResponse<T>;

  if (!response.ok) {
    if (response.status === 401) {
      const message = "Shopify rejected the access token; reconnect the Shopify channel";
      await markShopifyChannelError(channelId, Number(channel.user_id), message);
      throw new Error(message);
    }
    throw new Error(`Shopify GraphQL request failed with status ${response.status}`);
  }

  if (body.errors?.length) {
    throw new Error(
      body.errors
        .map((error) => error.message || "Unknown Shopify GraphQL error")
        .join("; "),
    );
  }

  if (!body.data) {
    throw new Error("Shopify GraphQL response did not contain data");
  }

  return body.data;
}

export async function getShop(channelId: string, userId: number) {
  return shopifyGraphQL<{
    shop: {
      id: string;
      name: string;
      myshopifyDomain: string;
    };
  }>(channelId, userId, `query GetShop { shop { id name myshopifyDomain } }`);
}
