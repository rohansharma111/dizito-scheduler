export type FlipkartListingStatus = "ACTIVE" | "INACTIVE";
export type FlipkartFulfillmentProfile = "NON_FBF" | "FBF_LITE" | "FBF";

export interface FlipkartPricePayload {
  mrp: number;
  selling_price: number;
  currency: string;
  mop?: number;
  nlc?: number;
  dealer_price?: number;
}

export interface FlipkartTaxPayload {
  hsn: string;
  is_gst_sellable?: boolean;
  goods_services_rate?: number;
  tax_code?: string;
  luxury_cess_percentage?: number;
}

export interface FlipkartLocationPayload {
  id: string;
  status: "ENABLED" | "DISABLED";
  inventory?: number;
  pending_inventory?: number;
}

export interface FlipkartPackagePayload {
  id?: string;
  name: string;
  dimensions?: {
    length: number;
    breadth: number;
    height: number;
  };
  weight?: number;
  notional_value?: {
    amount: number;
    unit: "PERCENTAGE" | "INR";
  };
  description?: string;
  handling?: {
    fragile: boolean;
  };
}

export interface FlipkartFulfillmentPayload {
  dispatch_sla: number;
  shipping_provider:
    | "FLIPKART"
    | "SELLER"
    | "FLIPKART_SELLER"
    | "SELLER_FLIPKART";
  procurement_type:
    | "EXPRESS"
    | "REGULAR"
    | "INTERNATIONAL"
    | "MADE_TO_ORDER"
    | "DOMESTIC";
  region_restriction?: "zonal" | "national" | "none";
}

export interface FlipkartAddressLabelPayload {
  manufacturer_details?: string[];
  importer_details?: string[];
  packer_details?: string[];
  countries_of_origin?: string[];
}

export interface FlipkartDatingLabelPayload {
  mfg_date?: number;
  shelf_life?: number;
  expiry_date?: number;
}

export interface FlipkartListingMutationInput {
  productId: string;
  price: FlipkartPricePayload;
  tax: FlipkartTaxPayload;
  listingStatus: FlipkartListingStatus;
  fulfillmentProfile: FlipkartFulfillmentProfile;
  packages: FlipkartPackagePayload[];
  locations: FlipkartLocationPayload[];
  shippingFees?: {
    local: number;
    zonal: number;
    national: number;
    currency: string;
  };
  subsidizedShipping?: boolean;
  fulfillment?: FlipkartFulfillmentPayload;
  addressLabel?: FlipkartAddressLabelPayload;
  datingLabel?: FlipkartDatingLabelPayload;
}

function nonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Flipkart ${field} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Flipkart ${field} must be non-negative`);
  }
  return value;
}

function requiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Flipkart ${field} is required`);
  return normalized;
}

function validatePrice(price: FlipkartPricePayload) {
  nonNegativeInteger(price.mrp, "MRP");
  nonNegativeInteger(price.selling_price, "selling price");
  requiredText(price.currency, "price currency");

  if (price.selling_price > price.mrp) {
    throw new Error("Flipkart selling price cannot exceed MRP");
  }

  for (const [name, value] of Object.entries({
    mop: price.mop,
    nlc: price.nlc,
    dealer_price: price.dealer_price,
  })) {
    if (value !== undefined) nonNegativeInteger(value, name);
  }
}

function validateTax(tax: FlipkartTaxPayload) {
  requiredText(tax.hsn, "HSN");

  for (const [name, value] of Object.entries({
    goods_services_rate: tax.goods_services_rate,
    luxury_cess_percentage: tax.luxury_cess_percentage,
  })) {
    if (value !== undefined) nonNegativeNumber(value, name);
  }
}

function validateLocations(locations: FlipkartLocationPayload[]) {
  if (locations.length === 0) {
    throw new Error("Flipkart listing requires at least one location");
  }

  for (const location of locations) {
    requiredText(location.id, "location ID");
    if (location.inventory !== undefined) {
      nonNegativeInteger(location.inventory, "inventory");
    }
    if (location.pending_inventory !== undefined) {
      nonNegativeInteger(location.pending_inventory, "pending inventory");
    }
  }
}

function validatePackages(packages: FlipkartPackagePayload[]) {
  if (packages.length === 0) {
    throw new Error("Flipkart listing requires at least one package");
  }

  for (const pkg of packages) {
    requiredText(pkg.name, "package name");

    if (pkg.weight !== undefined) {
      nonNegativeNumber(pkg.weight, "package weight");
    }

    if (pkg.dimensions) {
      for (const [name, value] of Object.entries(pkg.dimensions)) {
        nonNegativeNumber(value, `package dimension ${name}`);
      }
    }

    if (pkg.notional_value) {
      nonNegativeNumber(pkg.notional_value.amount, "package notional value");
    }
  }
}

export function buildFlipkartListingMutationPayload(
  input: FlipkartListingMutationInput,
) {
  const productId = requiredText(input.productId, "product ID");
  validatePrice(input.price);
  validateTax(input.tax);
  validateLocations(input.locations);
  validatePackages(input.packages);

  return {
    product_id: productId,
    price: input.price,
    tax: input.tax,
    listing_status: input.listingStatus,
    fulfillment_profile: input.fulfillmentProfile,
    packages: input.packages,
    locations: input.locations,
    ...(input.shippingFees ? { shipping_fees: input.shippingFees } : {}),
    ...(input.subsidizedShipping !== undefined
      ? { subsidized_shipping: input.subsidizedShipping }
      : {}),
    ...(input.fulfillment ? { fulfillment: input.fulfillment } : {}),
    ...(input.addressLabel ? { address_label: input.addressLabel } : {}),
    ...(input.datingLabel ? { dating_label: input.datingLabel } : {}),
  };
}
