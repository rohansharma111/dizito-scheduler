export type AmazonIdentifierType =
  | "ean"
  | "ean8"
  | "ean13"
  | "upc"
  | "gtin"
  | "gtin8"
  | "gtin12"
  | "gtin13"
  | "gtin14"
  | "isbn"
  | "isbn10"
  | "isbn13"
  | "isbn_10"
  | "isbn_13";

export type AmazonIdentifierValidation = {
  valid: boolean;
  message?: string;
};

function gtinChecksumValid(value: string): boolean {
  if (![8, 12, 13, 14].includes(value.length) || !/^\d+$/.test(value)) return false;
  const body = value.slice(0, -1);
  const check = Number(value.at(-1));
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

  if (!value) return { valid: false, message: "External product identifier is required." };

  if (["isbn", "isbn10"].includes(normalizedType)) {
    return isbn10ChecksumValid(value)
      ? { valid: true }
      : { valid: false, message: "Enter a valid ISBN-10, including a correct check digit." };
  }

  if (["isbn13"].includes(normalizedType)) {
    return isbn13ChecksumValid(value)
      ? { valid: true }
      : { valid: false, message: "Enter a valid ISBN-13, including a correct check digit." };
  }

  if (["ean8", "gtin8"].includes(normalizedType) && value.length !== 8) return { valid: false, message: "This identifier type requires 8 digits." };
  if (["ean13", "gtin13", "ean"].includes(normalizedType) && value.length !== 13) return { valid: false, message: "This identifier type requires 13 digits." };
  if (["upc", "gtin12"].includes(normalizedType) && value.length !== 12) return { valid: false, message: "This identifier type requires 12 digits." };
  if (["gtin14"].includes(normalizedType) && value.length !== 14) return { valid: false, message: "This identifier type requires 14 digits." };

  if (["ean", "ean8", "ean13", "upc", "gtin", "gtin8", "gtin12", "gtin13", "gtin14"].includes(normalizedType)) {
    return gtinChecksumValid(value)
      ? { valid: true }
      : { valid: false, message: "Enter a genuine EAN/UPC/GTIN with a valid check digit. Dizito will not alter or invent identifiers." };
  }

  return { valid: true };
}
