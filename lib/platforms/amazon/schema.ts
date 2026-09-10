export interface AmazonSchemaProperty {
  title?: string;
  description?: string;
  type?: string;
  enum?: unknown[];
  enumNames?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: AmazonSchemaProperty;
  properties?: Record<string, AmazonSchemaProperty>;
  required?: string[];
  anyOf?: AmazonSchemaProperty[];
  oneOf?: AmazonSchemaProperty[];
  allOf?: AmazonSchemaProperty[];
  [key: string]: unknown;
}

export interface AmazonListingSchemaSummary {
  required: string[];
  properties: Record<string, AmazonSchemaProperty>;
}

function findSchema(value: unknown): AmazonSchemaProperty | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (record.schema && typeof record.schema === "object") {
    return findSchema(record.schema);
  }

  if (record.properties && typeof record.properties === "object") {
    return value as AmazonSchemaProperty;
  }

  if (record.link && typeof record.link === "object") {
    return findSchema(record.link);
  }

  return null;
}

export function summarizeAmazonListingSchema(definition: unknown): AmazonListingSchemaSummary | null {
  const schema = findSchema(definition);
  if (!schema) return null;

  const properties = schema.properties ?? {};
  return {
    required: Array.isArray(schema.required) ? schema.required : [],
    properties,
  };
}
