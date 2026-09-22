import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type MockScenario = "valid" | "missing-required" | "catalog-mismatch" | "amazon-invalid";

type MockRequest = {
  scenario?: MockScenario;
  productType?: string;
  asin?: string | null;
  attributes?: Record<string, unknown>;
  price?: number;
  quantity?: number;
};

const requiredForProductType: Record<string, string[]> = {
  ABRASIVE_SHEETS: ["external_product_information", "externally_assigned_product_identifier"],
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasValue);
  return true;
}

function responseForScenario(
  scenario: MockScenario,
  productType: string,
  asin: string | null,
  attributes: Record<string, unknown>,
  price: number,
  quantity: number,
) {
  const base = {
    validationPreview: true,
    mock: true,
    productType,
    asin,
    draft: { productType, attributes, price, quantity },
  };

  if (scenario === "catalog-mismatch") {
    return {
      ...base,
      success: false,
      amazon: {
        status: "INVALID",
        issues: [{ code: "8541", attributeName: "product_type", message: "The submitted product type does not match the selected catalog item." }],
      },
      error: "Mock catalog identity/product type mismatch.",
    };
  }

  if (scenario === "amazon-invalid") {
    const issues = [] as Array<{ code: string; attributeName: string; message: string }>;
    if (!Number.isFinite(price) || price <= 0) issues.push({ code: "90183", attributeName: "purchasable_offer", message: "Offer price must be greater than zero." });
    if (!Number.isInteger(quantity) || quantity < 0) issues.push({ code: "90183", attributeName: "fulfillment_availability", message: "Quantity must be a non-negative integer." });
    if (!issues.length) issues.push({ code: "90183", attributeName: "purchasable_offer", message: "The submitted offer contains invalid values." });
    return { ...base, success: false, amazon: { status: "INVALID", issues }, error: "Mock Amazon offer validation failed." };
  }

  const required = requiredForProductType[productType] || [];
  const missing = required.filter((name) => !hasValue(attributes[name]));
  if (scenario === "missing-required" || missing.length > 0) {
    const names = missing.length ? missing : ["externally_assigned_product_identifier", "supplier_declared_dg_hz_regulation"];
    return {
      ...base,
      success: false,
      requiresAmazonAttributes: true,
      missingAttributes: names.map((name) => ({ name })),
      error: "Mock Amazon validation requires additional product information.",
    };
  }

  return { ...base, success: true, amazon: { status: "VALID", issues: [], submissionId: "MOCK-SUBMISSION-001" }, error: null };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as MockRequest;
    const scenario: MockScenario = body.scenario || "valid";
    const allowed: MockScenario[] = ["valid", "missing-required", "catalog-mismatch", "amazon-invalid"];
    if (!allowed.includes(scenario)) return NextResponse.json({ success: false, error: "Unsupported mock scenario" }, { status: 400 });

    const productType = body.productType?.trim().toUpperCase() || "ABRASIVE_SHEETS";
    const asin = body.asin?.trim().toUpperCase() || null;
    const attributes = body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes) ? body.attributes : {};
    const price = Number(body.price);
    const quantity = Number(body.quantity);
    const result = responseForScenario(scenario, productType, asin, attributes, price, quantity);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Mock Amazon validation failed" }, { status: 400 });
  }
}
