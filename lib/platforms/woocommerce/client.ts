import { getCommerceChannelById, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getWooCommerceCredentials } from "@/lib/platforms/woocommerce/credentials";

export interface WooCommerceClientConfig { storeUrl: string; consumerKey: string; consumerSecret: string; }

export function normalizeWooCommerceStoreUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) throw new Error("WooCommerce store URL must start with http:// or https://");
  const url = new URL(normalized);
  if (!url.hostname) throw new Error("WooCommerce store URL is invalid");
  return url.toString().replace(/\/$/, "");
}

function getApiUrl(storeUrl: string, path: string) { return `${normalizeWooCommerceStoreUrl(storeUrl)}/wp-json/wc/v3/${path.replace(/^\//, "")}`; }
function getAuthHeader(consumerKey: string, consumerSecret: string) { return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`; }

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
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : `WooCommerce request failed with status ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function getWooCommerceSystemStatus(config: WooCommerceClientConfig) { return wooCommerceRequest<unknown>(config, "system_status"); }
export async function createWooCommerceProduct(config: WooCommerceClientConfig, payload: Record<string, unknown>) { return wooCommerceRequest<unknown>(config, "products", { method: "POST", body: JSON.stringify(payload) }); }
export async function getWooCommerceProduct(config: WooCommerceClientConfig, externalId: string) { return wooCommerceRequest<Record<string, unknown>>(config, `products/${encodeURIComponent(externalId)}`); }
export async function findWooCommerceProductsBySku(config: WooCommerceClientConfig, sku: string) { return wooCommerceRequest<Array<Record<string, unknown>>>(config, `products?sku=${encodeURIComponent(sku)}`); }

export async function markWooCommerceChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, { status: "error", metadata: { woocommerceHealth: { status: "error", message, updatedAt: new Date().toISOString() } } }).catch((error) => console.error("Unable to mark WooCommerce channel as error:", error));
}
