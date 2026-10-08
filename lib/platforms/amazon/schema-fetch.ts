interface AmazonSchemaLink {
  link?: {
    resource?: string;
    verb?: string;
  };
}

const ALLOWED_SCHEMA_HOSTS = new Set([
  "sellingpartnerapi-na.amazon.com",
  "sellingpartnerapi-eu.amazon.com",
  "sellingpartnerapi-fe.amazon.com",
]);

function getSchemaResource(definition: unknown) {
  if (!definition || typeof definition !== "object") return null;
  const schema = (definition as { schema?: AmazonSchemaLink }).schema;
  const resource = schema?.link?.resource?.trim();
  return resource || null;
}

function validateSchemaResource(resource: string): URL {
  let url: URL;
  try {
    url = new URL(resource);
  } catch {
    throw new Error("Amazon product type schema URL is invalid");
  }

  if (url.protocol !== "https:" || !ALLOWED_SCHEMA_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Amazon product type schema URL is not an allowed Amazon SP-API resource");
  }

  return url;
}

export async function fetchAmazonProductTypeSchema(definition: unknown) {
  const resource = getSchemaResource(definition);
  if (!resource) return null;

  const url = validateSchemaResource(resource);
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Amazon product type schema fetch failed with status ${response.status}`);
  }

  return (await response.json()) as unknown;
}
