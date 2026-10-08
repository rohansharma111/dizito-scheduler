export const META_GRAPH_VERSION =
  process.env.META_GRAPH_VERSION || "v26.0";

export function metaGraphUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `https://graph.facebook.com/${META_GRAPH_VERSION}${normalizedPath}`;
}

export async function metaGraphGet(
  path: string,
  accessToken: string,
  fields?: string,
) {
  const url = new URL(metaGraphUrl(path));

  url.searchParams.set("access_token", accessToken);

  if (fields) {
    url.searchParams.set("fields", fields);
  }

  return fetch(url.toString());
}

export type MetaPage = {
  id: string;
  name: string;
  access_token?: string | null;
  tasks?: string[];
};

export type MetaCollectionResponse = {
  data?: unknown[];
};

export type MetaPageDiscovery = {
  pages: MetaPage[];
  source: "accounts" | "assigned_pages" | "none";
  accountsResponse: MetaCollectionResponse;
  assignedPagesResponse?: MetaCollectionResponse;
};

export async function discoverMetaPages(
  accessToken: string,
): Promise<MetaPageDiscovery> {
  const accountsResponse = await metaGraphGet(
    "/me/accounts",
    accessToken,
    "id,name,access_token",
  );

  const accountsData = await accountsResponse.json();

  console.log("META /me/accounts STATUS:", accountsResponse.status);

  if (!accountsResponse.ok) {
    throw new Error(
      `Meta /me/accounts request failed with status ${accountsResponse.status}`,
    );
  }

  const accountPages = Array.isArray(accountsData?.data)
    ? accountsData.data
    : [];

  if (accountPages.length > 0) {
    return {
      pages: accountPages,
      source: "accounts",
      accountsResponse: accountsData,
    };
  }

  /*
   * Business Portfolio / business-scoped users can have Pages assigned to
   * them without those Pages appearing in /me/accounts. In that case Meta
   * exposes the business-scoped /me/assigned_pages edge.
   *
   * This endpoint is intentionally a fallback. Normal users continue to use
   * /me/accounts and therefore do not need this path.
   */
  const assignedPagesResponse = await metaGraphGet(
    "/me/assigned_pages",
    accessToken,
    "id,name,access_token,tasks",
  );

  const assignedPagesData = await assignedPagesResponse.json();

  console.log(
    "META /me/assigned_pages STATUS:",
    assignedPagesResponse.status,
  );

  if (!assignedPagesResponse.ok) {
    return {
      pages: [],
      source: "none",
      accountsResponse: accountsData,
      assignedPagesResponse: assignedPagesData,
    };
  }

  const assignedPages = Array.isArray(assignedPagesData?.data)
    ? assignedPagesData.data
    : [];

  return {
    pages: assignedPages,
    source: assignedPages.length > 0 ? "assigned_pages" : "none",
    accountsResponse: accountsData,
    assignedPagesResponse: assignedPagesData,
  };
}

export async function getInstagramBusinessAccount(
  pageId: string,
  accessToken: string,
) {
  const response = await metaGraphGet(
    `/${pageId}`,
    accessToken,
    "instagram_business_account",
  );

  const data = await response.json();

  return {
    response,
    data,
    instagramBusinessId:
      data?.instagram_business_account?.id || null,
  };
}
