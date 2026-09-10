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
  conditionalRequired: string[];
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

function collectConditionalRequired(schema: AmazonSchemaProperty): string[] {
  const names = new Set<string>();

  function visit(value: unknown, conditional = false) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    if (conditional && Array.isArray(record.required)) {
      for (const name of record.required) {
        if (typeof name === "string") names.add(name);
      }
    }

    for (const key of ["then", "else", "dependentSchemas"]) {
      const child = record[key];
      if (key === "dependentSchemas" && child && typeof child === "object") {
        for (const schemaValue of Object.values(child as Record<string, unknown>)) {
          visit(schemaValue, true);
        }
      } else {
        visit(child, true);
      }
    }

    for (const key of ["allOf", "anyOf", "oneOf"]) {
      const children = record[key];
      if (Array.isArray(children)) {
        for (const child of children) visit(child, conditional || key !== "allOf");
      }
    }
  }

  visit(schema, false);
  for (const name of schema.required ?? []) names.delete(name);
  return [...names].sort();
}

export function summarizeAmazonListingSchema(definition: unknown): AmazonListingSchemaSummary | null {
  const schema = findSchema(definition);
  if (!schema) return null;

  const properties = schema.properties ?? {};
  return {
    required: Array.isArray(schema.required) ? schema.required : [],
    conditionalRequired: collectConditionalRequired(schema),
    properties,
  };
}
