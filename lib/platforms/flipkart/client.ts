import { getCommerceChannelById, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getFlipkartCredentials } from "@/lib/platforms/flipkart/credentials";

export type FlipkartEnvironment = "sandbox" | "production";

export interface FlipkartClientConfig {
  accessToken: string;
  environment: FlipkartEnvironment;
  accessTokenExpiresAt?: Date | string | null;
}

const BASE_URLS: Record<FlipkartEnvironment, string> = {
  sandbox: "https://sandbox-api.flipkart.net/sellers",
  production: "https://api.flipkart.net/sellers",
};

const REQUEST_TIMEOUT_MS = 15_000;
const EXPIRY_SKEW_MS = 60_000;

function normalizeEnvironment(value: unknown): FlipkartEnvironment {
  return value === "sandbox" ? "sandbox" : "production";
}

function getApiUrl(environment: FlipkartEnvironment, path: string) {
  return `${BASE_URLS[environment]}/${path.replace(/^\//, "")}`;
}

function assertAccessTokenUsable(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return;
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) {
    throw new Error("Flipkart access token expiry is invalid");
  }
  if (expiry <= Date.now() + EXPIRY_SKEW_MS) {
    throw new Error("Flipkart access token is expired or nearing expiry; refresh is required");
  }
}

export async function flipkartRequest<T>(
  config: FlipkartClientConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!config.accessToken.trim()) {
    throw new Error("Flipkart access token is required");
  }

  assertAccessTokenUsable(config.accessTokenExpiresAt);

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${config.accessToken}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = init.signal ? null : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(getApiUrl(config.environment, path), {
      ...init,
      headers,
      signal: init.signal ?? controller?.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      throw new Error(`Flipkart request failed with status ${response.status}`);
    }

    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Flipkart request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getFlipkartListings(config: FlipkartClientConfig, skuIds: string[]) {
  const normalizedSkuIds = skuIds.map((sku) => sku.trim()).filter(Boolean);
  if (normalizedSkuIds.length === 0 || normalizedSkuIds.length > 10) {
    throw new Error("Flipkart listing lookup requires between 1 and 10 SKU IDs");
  }

  return flipkartRequest<unknown>(
    config,
    `listings/v3/${normalizedSkuIds.map(encodeURIComponent).join(",")}`,
  );
}

export async function getFlipkartListingDetails(config: FlipkartClientConfig, skuIds: string[]) {
  const normalizedSkuIds = skuIds.map((sku) => sku.trim()).filter(Boolean);
  if (normalizedSkuIds.length === 0 || normalizedSkuIds.length > 10) {
    throw new Error("Flipkart listing details requires between 1 and 10 SKU IDs");
  }

  return flipkartRequest<unknown>(config, "listings/v3/details", {
    method: "POST",
    body: JSON.stringify({ sku_ids: normalizedSkuIds }),
  });
}

export async function searchFlipkartListings(
  config: FlipkartClientConfig,
  input: { listingStatus?: "ACTIVE" | "INACTIVE"; pageId?: string | null } = {},
) {
  const filters = input.listingStatus ? { listing_status: input.listingStatus } : {};
  return flipkartRequest<unknown>(config, "listings/v3/search", {
    method: "POST",
    body: JSON.stringify({ filters, page_id: input.pageId ?? null }),
  });
}

export async function assertFlipkartChannel(channelId: string, userId: number) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel || channel.provider !== "flipkart") {
    throw new Error("Flipkart channel not found");
  }
  if (channel.status !== "active") {
    throw new Error(`Flipkart channel is not active (status: ${channel.status})`);
  }
  return channel;
}

export async function getFlipkartChannelConfig(channelId: string, userId: number) {
  const channel = await assertFlipkartChannel(channelId, userId);
  const credentials = await getFlipkartCredentials(channelId);
  if (!credentials) {
    throw new Error("Flipkart credentials not found");
  }

  assertAccessTokenUsable(credentials.accessTokenExpiresAt);

  const metadata = (channel.metadata ?? {}) as Record<string, unknown>;
  const environment = normalizeEnvironment(metadata.flipkartEnvironment);

  return {
    channel,
    config: {
      accessToken: credentials.accessToken,
      accessTokenExpiresAt: credentials.accessTokenExpiresAt,
      environment,
    } satisfies FlipkartClientConfig,
  };
}

export async function markFlipkartChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, {
    status: "error",
    metadata: {
      flipkartHealth: { status: "error", message, updatedAt: new Date().toISOString() },
    },
  }).catch((error) => {
    console.error("Unable to mark Flipkart channel as error:", error);
  });
}
