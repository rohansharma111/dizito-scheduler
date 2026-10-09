export type ExternalProductReference = {
  id: number;
  name: string;
  sku?: string;
  price?: string;
  stockStatus?: string;
  permalink?: string;
};

/**
 * Validates provider-owned product context before it is persisted as planning
 * metadata. These references intentionally remain separate from canonical IDs.
 */
export function validateExternalProductReferences(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 20) return "Invalid external product references";

  for (const product of value) {
    if (
      !product ||
      typeof product !== "object" ||
      !Number.isInteger((product as any).id) ||
      (product as any).id <= 0 ||
      typeof (product as any).name !== "string" ||
      (product as any).name.trim().length === 0 ||
      (product as any).name.length > 200
    ) {
      return "Invalid external product reference";
    }

    const record = product as Record<string, unknown>;
    if (["sku", "price", "stockStatus", "permalink"].some((key) =>
      record[key] != null &&
      (typeof record[key] !== "string" ||
        (record[key] as string).length > (key === "permalink" ? 2048 : 200))
    )) {
      return "External product fields exceed allowed limits";
    }

    if (record.permalink != null) {
      try {
        if (new URL(record.permalink as string).protocol !== "https:") throw new Error("Invalid URL");
      } catch {
        return "Invalid external product URL";
      }
    }
  }

  return null;
}
