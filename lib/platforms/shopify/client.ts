import { getCommerceChannelByIdInternal } from "@/lib/commerce/channels/service";
import {
  getShopifyCredentials,
  saveShopifyCredentials,
} from "@/lib/commerce/channels/credentials";
import { getShopifyApiVersion } from "@/lib/platforms/shopify/auth";

interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

function getClientCredentials() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(shop: string, refreshToken: string) {
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

  return body;
}

async function getAccessToken(channelId: string) {
  const channel = await getCommerceChannelByIdInternal(channelId);
  if (!channel || channel.provider !== "shopify") {
    throw new Error("Shopify channel not found");
  }

  const credentials = await getShopifyCredentials(channelId);
  if (!credentials) {
    throw new Error("Shopify credentials not found");
  }

  const expiresSoon =
    credentials.accessTokenExpiresAt &&
    credentials.accessTokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return { channel, accessToken: credentials.accessToken };
  }

  if (!credentials.refreshToken) {
    throw new Error("Shopify access token expired and no refresh token is available");
  }

  const refreshed = await refreshAccessToken(
    String(channel.external_account_id),
    credentials.refreshToken,
  );

  await saveShopifyCredentials({
    channelId,
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
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { channel, accessToken } = await getAccessToken(channelId);
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

export async function getShop(channelId: string) {
  return shopifyGraphQL<{
    shop: {
      id: string;
      name: string;
      myshopifyDomain: string;
    };
  }>(channelId, `query GetShop { shop { id name myshopifyDomain } }`);
}
