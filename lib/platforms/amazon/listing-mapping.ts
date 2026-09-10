export type AmazonFieldSource =
  | "product.name"
  | "product.description"
  | "product.brand"
  | "product.category"
  | "variant.sku"
  | "variant.barcode"
  | "variant.price"
  | "manual";

export interface AmazonFieldMapping {
  source: AmazonFieldSource;
  value?: string;
}

export type AmazonFieldMappings = Record<string, AmazonFieldMapping>;
