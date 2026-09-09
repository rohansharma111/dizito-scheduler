import { getAmazonCredentials } from "@/lib/commerce/channels/amazon-credentials";
import { getCommerceChannelByIdInternal } from "@/lib/commerce/channels/service";
import {
  getAmazonSpApiEndpoint,
  refreshAmazonAccessToken,
} from "@/lib/platforms/amazon/auth";

export interface AmazonSpApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface AmazonSpApiResponse<T> {
  data: T;
  requestId: string | null;
}

async function getAccessToken(channelId: string) {
  const channel = await getCommerceChannelByIdInternal(channelId);
  if (!channel || channel.provider !== "amazon") throw new Error("Amazon channel not found");
  if (channel.status !== "active") {
    throw new Error(`Amazon channel is not active (status: ${channel.status})`);
  }

  const credentials = await getAmazonCredentials(channelId);
  if (!credentials) throw new Error("Amazon credentials not found; reconnect the Amazon channel");

  const refreshed = await refreshAmazonAccessToken(credentials.refreshToken);
  return { channel, accessToken: refreshed.accessToken };
}

/**
 * Typed SP-API transport boundary. Seller-authorized SP-API calls require AWS SigV4
 * signing in addition to the LWA access token. Provider operations should be added
 * here only after the app's AWS signing credentials and signing convention are
 * established; product/listing logic must not bypass this boundary.
 */
export async function amazonSpApiRequest<T>(
  channelId: string,
  options: AmazonSpApiRequestOptions,
): Promise<AmazonSpApiResponse<T>> {
  const { accessToken } = await getAccessToken(channelId);
  const endpoint = getAmazonSpApiEndpoint();
  const url = new URL(options.path, endpoint);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  throw new Error(
    `Amazon SP-API request transport is not enabled yet for ${options.method ?? "GET"} ${url.pathname}. ` +
      `LWA authorization is established; AWS SigV4 signing must be configured before seller-authorized API calls are enabled. ` +
      `Access token acquired: ${Boolean(accessToken)}`,
  );
}
