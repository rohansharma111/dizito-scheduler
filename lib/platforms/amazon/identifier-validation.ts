export type AmazonIdentifierType =
  | "ean" | "ean8" | "ean13" | "upc" | "gtin" | "gtin8" | "gtin12" | "gtin13" | "gtin14"
  | "isbn" | "isbn10" | "isbn13" | "isbn_10" | "isbn_13";

export type AmazonIdentifierValidation = { valid: boolean; message?: string };

function gtinChecksumValid(value: string): boolean {
  if (![8, 12, 13, 14].includes(value.length) || !/^\d+$/.test(value)) return false;
  const body = value.slice(0, -1);
  const check = Number(value[value.length - 1]);
  let sum = 0;
  for (let index = body.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += Number(body[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === check;
}

function isbn10ChecksumValid(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  return value.split("").reduce((sum, digit, index) => sum + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
}

function isbn13ChecksumValid(value: string): boolean {
  if (!/^\d{13}$/.test(value) || (!value.startsWith("978") && !value.startsWith("979"))) return false;
  const sum = value.slice(0, 12).split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}

export function validateAmazonExternalIdentifier(type: string | undefined, rawValue: string): AmazonIdentifierValidation {
  const normalizedType = (type || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const value = rawValue.replace(/[\s-]/g, "").toUpperCase();
  if (!value) return { valid: true };

  if (normalizedType === "isbn") {
    const valid = value.length === 10 ? isbn10ChecksumValid(value) : value.length === 13 ? isbn13ChecksumValid(value) : false;
    return valid ? { valid: true } : { valid: false, message: "Enter a valid ISBN-10 or ISBN-13 with a correct check digit." };
  }
  if (normalizedType === "isbn10") {
    return isbn10ChecksumValid(value) ? { valid: true } : { valid: false, message: "Enter a valid ISBN-10, including a correct check digit." };
  }
  if (normalizedType === "isbn13") {
    return isbn13ChecksumValid(value) ? { valid: true } : { valid: false, message: "Enter a valid ISBN-13, including a correct check digit." };
  }

  const lengths: Record<string, number> = { ean8: 8, gtin8: 8, ean13: 13, gtin13: 13, ean: 13, upc: 12, gtin12: 12, gtin14: 14 };
  if (lengths[normalizedType] && value.length !== lengths[normalizedType]) {
    return { valid: false, message: `This identifier type requires ${lengths[normalizedType]} digits.` };
  }
  if (["ean", "ean8", "ean13", "upc", "gtin", "gtin8", "gtin12", "gtin13", "gtin14"].includes(normalizedType)) {
    return gtinChecksumValid(value) ? { valid: true } : { valid: false, message: "Enter a genuine EAN/UPC/GTIN with a valid check digit. Dizito will not alter or invent identifiers." };
  }
  return { valid: true };
}
