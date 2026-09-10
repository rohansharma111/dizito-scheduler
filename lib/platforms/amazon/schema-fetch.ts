interface AmazonSchemaLink {
  link?: {
    resource?: string;
    verb?: string;
  };
}

function getSchemaResource(definition: unknown) {
  if (!definition || typeof definition !== "object") return null;
  const schema = (definition as { schema?: AmazonSchemaLink }).schema;
  const resource = schema?.link?.resource?.trim();
  return resource || null;
}

export async function fetchAmazonProductTypeSchema(definition: unknown) {
  const resource = getSchemaResource(definition);
  if (!resource) return null;

  const response = await fetch(resource, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Amazon product type schema fetch failed with status ${response.status}`);
  }

  return (await response.json()) as unknown;
}
