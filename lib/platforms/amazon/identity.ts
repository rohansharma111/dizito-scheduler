export type AmazonProductIdentifierType = "ean" | "upc" | "gtin" | "isbn";

export interface AmazonProductIdentifier {
  type: AmazonProductIdentifierType;
  value: string;
}

function digits(value: string) {
  return value.replace(/[-\s]/g, "");
}

function validGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  let sum = 0;
  const body = value.slice(0, -1);
  for (let index = body.length - 1, position = 0; index >= 0; index--, position++) {
    sum += Number(body[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

function validIsbn(value: string) {
  if (/^\d{13}$/.test(value)) return validGtin(value);
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index++) {
    sum += (index + 1) * (value[index] === "X" ? 10 : Number(value[index]));
  }
  return sum % 11 === 0;
}

export function normalizeAmazonProductIdentifier(identifier: AmazonProductIdentifier) {
  const value = digits(identifier.value).toUpperCase();
  if (!value) throw new Error("Product identifier is required.");
  if (identifier.type === "isbn" && !validIsbn(value)) throw new Error("Enter a valid ISBN-10 or ISBN-13.");
  if (identifier.type !== "isbn" && !validGtin(value)) throw new Error("Enter a valid GTIN/EAN/UPC value with a correct check digit.");
  return { type: identifier.type, value };
}

export function buildAmazonExternalProductIdentifier(identifier: AmazonProductIdentifier, marketplaceId: string) {
  const normalized = normalizeAmazonProductIdentifier(identifier);
  return [{ value: normalized.value, type: normalized.type, marketplace_id: marketplaceId }];
}

export function normalizeAmazonMerchantSuggestedAsin(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^B[0-9A-Z]{9}$/.test(normalized)) {
    throw new Error("Enter a valid Amazon ASIN (10 characters, starting with B).");
  }
  return normalized;
}

export function buildAmazonMerchantSuggestedAsin(value: string, marketplaceId: string) {
  const normalized = normalizeAmazonMerchantSuggestedAsin(value);
  return [{ value: normalized, marketplace_id: marketplaceId }];
}
