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
  if (record.schema && typeof record.schema === "object") return findSchema(record.schema);
  if (record.properties && typeof record.properties === "object") return value as AmazonSchemaProperty;
  if (record.link && typeof record.link === "object") return findSchema(record.link);
  return null;
}

function matchesSchema(value: unknown, schema: AmazonSchemaProperty): boolean {
  if (!schema || typeof schema !== "object") return true;
  if (schema.const !== undefined && value !== schema.const) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) return false;

  if (schema.required?.length) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const object = value as Record<string, unknown>;
    if (schema.required.some((name) => object[name] === undefined || object[name] === null)) return false;
  }

  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const [name, property] of Object.entries(schema.properties)) {
      if (object[name] !== undefined && !matchesSchema(object[name], property)) return false;
    }
  }

  if (schema.type === "object" && (value === null || typeof value !== "object" || Array.isArray(value))) return false;
  if (schema.type === "array" && !Array.isArray(value)) return false;
  if (schema.type === "string" && typeof value !== "string") return false;
  if (schema.type === "number" && typeof value !== "number") return false;
  if (schema.type === "integer" && (typeof value !== "number" || !Number.isInteger(value))) return false;
  if (schema.type === "boolean" && typeof value !== "boolean") return false;

  if (schema.allOf?.some((child) => !matchesSchema(value, child))) return false;
  if (schema.anyOf?.length && !schema.anyOf.some((child) => matchesSchema(value, child))) return false;
  if (schema.oneOf?.length && schema.oneOf.filter((child) => matchesSchema(value, child)).length !== 1) return false;
  return true;
}

function collectConditionalRequired(schema: AmazonSchemaProperty, attributes?: Record<string, unknown>): string[] {
  // Conditional requirements are meaningful only after we have the current
  // draft. Without attributes, do not advertise every possible branch.
  if (!attributes) return [];

  const names = new Set<string>();
  function collectRequired(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.required)) {
      for (const name of record.required) if (typeof name === "string") names.add(name);
    }
  }

  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    if (record.if && typeof record.if === "object") {
      if (matchesSchema(attributes, record.if as AmazonSchemaProperty)) {
        collectRequired(record.then);
        visit(record.then);
      } else if (record.else) {
        collectRequired(record.else);
        visit(record.else);
      }
    }

    const dependentSchemas = record.dependentSchemas;
    if (dependentSchemas && typeof dependentSchemas === "object") {
      for (const [dependency, dependencySchema] of Object.entries(dependentSchemas as Record<string, unknown>)) {
        if (Object.prototype.hasOwnProperty.call(attributes, dependency)) {
          collectRequired(dependencySchema);
          visit(dependencySchema);
        }
      }
    }

    const allOf = record.allOf;
    if (Array.isArray(allOf)) for (const child of allOf) visit(child);

    for (const key of ["anyOf", "oneOf"]) {
      const children = record[key];
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child && typeof child === "object" && (child as Record<string, unknown>).if) visit(child);
        }
      }
    }
  }

  visit(schema);
  for (const name of schema.required ?? []) names.delete(name);
  return [...names].sort();
}

export function summarizeAmazonListingSchema(definition: unknown, attributes?: Record<string, unknown>): AmazonListingSchemaSummary | null {
  const schema = findSchema(definition);
  if (!schema) return null;
  const properties = schema.properties ?? {};
  return {
    required: Array.isArray(schema.required) ? schema.required : [],
    conditionalRequired: collectConditionalRequired(schema, attributes),
    properties,
  };
}
