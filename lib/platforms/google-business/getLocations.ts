import { GoogleBusinessLocation } from "./types";

export class GoogleBusinessApiError extends Error {
  readonly status: number;
  readonly reason?: string;
  readonly retryAfter?: string;

  constructor(
    message: string,
    status: number,
    reason?: string,
    retryAfter?: string,
  ) {
    super(message);
    this.name = "GoogleBusinessApiError";
    this.status = status;
    this.reason = reason;
    this.retryAfter = retryAfter;
  }
}

async function parseGoogleError(response: Response): Promise<GoogleBusinessApiError> {
  let reason: string | undefined;
  let message = "Google Business API request failed";

  try {
    const payload = await response.json();
    const error = payload?.error;

    if (typeof error?.message === "string") {
      message = error.message;
    }

    if (Array.isArray(error?.errors) && typeof error.errors[0]?.reason === "string") {
      reason = error.errors[0].reason;
    }

    if (typeof error?.status === "string" && !reason) {
      reason = error.status;
    }
  } catch {
    // Keep the provider response opaque when it isn't valid JSON.
  }

  return new GoogleBusinessApiError(
    message,
    response.status,
    reason,
    response.headers.get("retry-after") ?? undefined,
  );
}

export async function getLocations(
  accessToken: string,
): Promise<GoogleBusinessLocation[]> {
  const accountsResponse = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!accountsResponse.ok) {
    throw await parseGoogleError(accountsResponse);
  }

  const accountsData = await accountsResponse.json();

  const accounts = Array.isArray(accountsData.accounts)
    ? accountsData.accounts
    : [];

  const locations: GoogleBusinessLocation[] = [];

  for (const account of accounts) {
    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const error = await parseGoogleError(response);

      console.error("Google Business location discovery failed", {
        status: error.status,
        reason: error.reason,
        retryAfter: error.retryAfter,
      });

      if (error.status === 429 || error.reason === "rateLimitExceeded") {
        throw error;
      }

      continue;
    }

    const data = await response.json();

    const items = Array.isArray(data.locations) ? data.locations : [];

    for (const location of items) {
      locations.push({
        id: location.name,
        name: location.title ?? "Untitled Location",
        storeCode: location.storeCode ?? undefined,
        accountName: account.accountName,
        accountId: account.name,
      });
    }
  }

  return locations;
}
