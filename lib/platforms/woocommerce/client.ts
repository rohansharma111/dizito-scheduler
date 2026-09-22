import { getCommerceChannelByIdInternal, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getWooCommerceCredentials } from "@/lib/platforms/woocommerce/credentials";

export interface WooCommerceClientConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export function normalizeWooCommerceStoreUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) throw new Error("WooCommerce store URL must start with http:// or https://");
  const url = new URL(normalized);
  if (!url.hostname) throw new Error("WooCommerce store URL is invalid");
  return url.toString().replace(/\/$/, "");
}

function getApiUrl(storeUrl: string, path: string) {
  return `${normalizeWooCommerceStoreUrl(storeUrl)}/wp-json/wc/v3/${path.replace(/^\//, "")}`;
}

function getAuthHeader(consumerKey: string, consumerSecret: string) {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

export async function wooCommerceRequest<T>(config: WooCommerceClientConfig, path: string, init: RequestInit = {}): Promise<T> {
  if (!config.consumerKey || !config.consumerSecret) throw new Error("WooCommerce consumer key and consumer secret are required");
  const headers = new Headers(init.headers);
  headers.set("Authorization", getAuthHeader(config.consumerKey, config.consumerSecret));
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(getApiUrl(config.storeUrl, path), { ...init, headers, cache: "no-store" });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message
      : `WooCommerce request failed with status ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function getWooCommerceSystemStatus(config: WooCommerceClientConfig) {
  return wooCommerceRequest<unknown>(config, "system_status");
}

export async function createWooCommerceProduct(config: WooCommerceClientConfig, payload: Record<string, unknown>) {
  return wooCommerceRequest<unknown>(config, "products", { method: "POST", body: JSON.stringify(payload) });
}

export async function assertWooCommerceChannel(channelId: string) {
  const channel = await getCommerceChannelByIdInternal(channelId);
  if (!channel || channel.provider !== "woocommerce") throw new Error("WooCommerce channel not found");
  if (channel.status !== "active") throw new Error(`WooCommerce channel is not active (status: ${channel.status})`);
  return channel;
}

export async function getWooCommerceChannelConfig(channelId: string) {
  const channel = await assertWooCommerceChannel(channelId);
  const credentials = await getWooCommerceCredentials(channelId);
  if (!credentials) throw new Error("WooCommerce credentials not found");
  const metadata = (channel.metadata ?? {}) as Record<string, unknown>;
  const storeUrl = typeof metadata.storeUrl === "string" ? metadata.storeUrl : String(channel.external_account_id ?? "");
  if (!storeUrl) throw new Error("WooCommerce store URL is not configured");
  return { channel, config: { storeUrl, ...credentials } };
}

export async function markWooCommerceChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, {
    status: "error",
    metadata: { woocommerceHealth: { status: "error", message, updatedAt: new Date().toISOString() } },
  }).catch((error) => console.error("Unable to mark WooCommerce channel as error:", error));
}
