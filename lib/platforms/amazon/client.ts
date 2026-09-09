import { getAmazonCredentials } from "@/lib/commerce/channels/amazon-credentials";
import { getCommerceChannelByIdInternal, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getAmazonMarketplaceId, getAmazonSpApiEndpoint, refreshAmazonAccessToken } from "@/lib/platforms/amazon/auth";
import { signAmazonSpApiRequest } from "@/lib/platforms/amazon/sigv4";

export interface AmazonSpApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface AmazonSpApiResponse<T> {
  data: T;
  requestId: string | null;
  rateLimit: string | null;
}

export class AmazonSpApiError extends Error {
  status: number;
  requestId: string | null;
  errorType: string | null;
  rateLimit: string | null;

  constructor(message: string, details: { status: number; requestId: string | null; errorType: string | null; rateLimit: string | null }) {
    super(message);
    this.name = "AmazonSpApiError";
    this.status = details.status;
    this.requestId = details.requestId;
    this.errorType = details.errorType;
    this.rateLimit = details.rateLimit;
  }
}

interface AmazonErrorResponse {
  errors?: Array<{ code?: string; message?: string; details?: string }>;
}

async function getAccessToken(channelId: string) {
  const channel = await getCommerceChannelByIdInternal(channelId);
  if (!channel || channel.provider !== "amazon") throw new Error("Amazon channel not found");
  if (channel.status !== "active") throw new Error(`Amazon channel is not active (status: ${channel.status})`);

  const credentials = await getAmazonCredentials(channelId);
  if (!credentials) throw new Error("Amazon credentials not found; reconnect the Amazon channel");

  const refreshed = await refreshAmazonAccessToken(credentials.refreshToken);
  return { channel, accessToken: refreshed.accessToken };
}

async function markAmazonChannelError(channelId: string, userId: number, message: string) {
  await updateCommerceChannel(channelId, userId, {
    status: "error",
    metadata: { amazonHealth: { status: "error", message, updatedAt: new Date().toISOString() } },
  }).catch((error) => console.error("Unable to mark Amazon channel as error:", error));
}

export async function amazonSpApiRequest<T>(channelId: string, options: AmazonSpApiRequestOptions): Promise<AmazonSpApiResponse<T>> {
  const { channel, accessToken } = await getAccessToken(channelId);
  const endpoint = getAmazonSpApiEndpoint();
  const url = new URL(options.path, endpoint);
  const method = (options.method ?? "GET").toUpperCase();
  const body = options.body === undefined ? "" : JSON.stringify(options.body);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const signedHeaders = signAmazonSpApiRequest({
    url,
    method,
    body,
    headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}), "x-amz-access-token": accessToken },
  });

  const response = await fetch(url, { method, headers: signedHeaders, body: body || undefined, cache: "no-store" });
  const requestId = response.headers.get("x-amzn-RequestId");
  const rateLimit = response.headers.get("x-amzn-RateLimit-Limit");
  const errorType = response.headers.get("x-amzn-ErrorType");
  const rawBody = await response.text();

  let parsed: unknown = null;
  if (rawBody) {
    try { parsed = JSON.parse(rawBody); } catch { parsed = null; }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as AmazonErrorResponse;
    const firstError = errorBody.errors?.[0];
    const message = firstError?.message || firstError?.details || errorType || `Amazon SP-API request failed with status ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      await markAmazonChannelError(String(channel.id), Number(channel.user_id), `${message}${requestId ? ` (request ${requestId})` : ""}`);
    }

    throw new AmazonSpApiError(message, { status: response.status, requestId, errorType, rateLimit });
  }

  return { data: parsed as T, requestId, rateLimit };
}

export interface AmazonMarketplaceParticipation {
  marketplace: { id: string; countryCode: string; name: string; defaultLanguageCode: string; defaultCurrencyCode: string; domainName: string };
  participation: { isParticipating: boolean; hasSuspendedListings: boolean };
}

export async function getAmazonMarketplaceParticipations(channelId: string) {
  return amazonSpApiRequest<{ payload: AmazonMarketplaceParticipation[] }>(channelId, {
    method: "GET",
    path: "/sellers/v1/marketplaceParticipations",
  });
}

export async function verifyAmazonConnection(channelId: string) {
  const result = await getAmazonMarketplaceParticipations(channelId);
  const marketplaceId = getAmazonMarketplaceId();
  const participation = result.data.payload?.find((item) => item.marketplace.id === marketplaceId);

  if (!participation) throw new Error(`Amazon account is not participating in marketplace ${marketplaceId}`);
  if (!participation.participation.isParticipating) throw new Error(`Amazon account is not active in marketplace ${marketplaceId}`);

  return { marketplaceId, marketplace: participation.marketplace, participation: participation.participation, requestId: result.requestId, rateLimit: result.rateLimit };
}
