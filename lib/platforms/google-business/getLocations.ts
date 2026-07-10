import { GoogleBusinessLocation } from "./types";

export async function getLocations(
  accessToken: string,
): Promise<GoogleBusinessLocation[]> {
  /*
    Step 1
    Fetch Business Accounts
  */

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
    let message = "Failed to fetch Google Business accounts";

    try {
      const error = await accountsResponse.json();

      message = error.error?.message || error.message || JSON.stringify(error);
    } catch {}

    throw new Error(message);
  }

  const accountsData = await accountsResponse.json();

  const accounts = Array.isArray(accountsData.accounts)
    ? accountsData.accounts
    : [];

  const locations: GoogleBusinessLocation[] = [];

  /*
    Step 2
    Fetch Locations for every account
  */

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
      const error = await response.text();

      console.error(`Failed to fetch locations for ${account.name}:`, error);

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
