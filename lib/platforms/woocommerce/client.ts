import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { getCommerceChannelById, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getWooCommerceCredentials } from "@/lib/platforms/woocommerce/credentials";

export interface WooCommerceClientConfig { storeUrl: string; consumerKey: string; consumerSecret: string; }

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const octets = host.split(".").map(Number);
    const [a, b] = octets;
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
  }
  if (ipVersion === 6) {
    return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  }
  return false;
}

export function normalizeWooCommerceStoreUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("WooCommerce store URL must start with http:// or https://");
  }
  const url = new URL(normalized);
  if (!url.hostname || url.username || url.password) {
    throw new Error("WooCommerce store URL is invalid");
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new Error("WooCommerce store URL must use a public host");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("WooCommerce store URL must use HTTPS in production");
  }
  return url.toString().replace(/\/$/, "");
}

async function assertPublicDnsResolution(storeUrl: string) {
  const url = new URL(normalizeWooCommerceStoreUrl(storeUrl));
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateOrLocalHost(address))) {
    throw new Error("WooCommerce store URL resolves to a private or local network address");
  }
}

function getApiUrl(storeUrl: string, path: string) { return `${normalizeWooCommerceStoreUrl(storeUrl)}/wp-json/wc/v3/${path.replace(/^\//, "")}`; }
function getAuthHeader(consumerKey: string, consumerSecret: string) { return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`; }

export async function wooCommerceRequest<T>(config: WooCommerceClientConfig, path: string, init: RequestInit = {}): Promise<T> {
  if (!config.consumerKey || !config.consumerSecret) throw new Error("WooCommerce consumer key and consumer secret are required");
  const headers = new Headers(init.headers);
  headers.set("Authorization", getAuthHeader(config.consumerKey, config.consumerSecret));
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  await assertPublicDnsResolution(config.storeUrl);
  const controller = init.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 15_000) : null;
  let response: Response;
  try {
    response = await fetch(getApiUrl(config.storeUrl, path), { ...init, headers, signal: init.signal ?? controller?.signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("WooCommerce request timed out after 15000ms");
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`WooCommerce request failed with status ${response.status}`);
  }
  return body as T;
}

export async function getWooCommerceChannelConfig(channelId: string, userId: number) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel) {
    throw new Error("WooCommerce channel not found");
  }
  if (channel.provider !== "woocommerce") {
    throw new Error("Invalid WooCommerce channel provider");
  }
  if (channel.status !== "active") {
    throw new Error(`WooCommerce channel is not active (status: ${channel.status})`);
  }

  const metadata =
    channel.metadata && typeof channel.metadata === "object"
      ? (channel.metadata as Record<string, unknown>)
      : {};
  const storeUrlValue = metadata.storeUrl;
  if (typeof storeUrlValue !== "string" || !storeUrlValue.trim()) {
    throw new Error("WooCommerce store URL is not configured");
  }

  const credentials = await getWooCommerceCredentials(channelId, userId);
  if (!credentials) {
    throw new Error("WooCommerce credentials not found");
  }

  return {
    channel,
    config: {
      storeUrl: normalizeWooCommerceStoreUrl(storeUrlValue),
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
    } satisfies WooCommerceClientConfig,
  };
}

export async function getWooCommerceSystemStatus(config: WooCommerceClientConfig) { return wooCommerceRequest<unknown>(config, "system_status"); }
export async function createWooCommerceProduct(config: WooCommerceClientConfig, payload: Record<string, unknown>) { return wooCommerceRequest<unknown>(config, "products", { method: "POST", body: JSON.stringify(payload) }); }
export async function getWooCommerceProduct(config: WooCommerceClientConfig, externalId: string) { return wooCommerceRequest<Record<string, unknown>>(config, `products/${encodeURIComponent(externalId)}`); }
export async function findWooCommerceProductsBySku(config: WooCommerceClientConfig, sku: string) { return wooCommerceRequest<Array<Record<string, unknown>>>(config, `products?sku=${encodeURIComponent(sku)}`); }

export async function markWooCommerceChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, { status: "error", metadata: { woocommerceHealth: { status: "error", message, updatedAt: new Date().toISOString() } } }).catch((error) => console.error("Unable to mark WooCommerce channel as error:", error));
}
