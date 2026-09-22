import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type MockScenario = "valid" | "missing-required" | "catalog-mismatch" | "amazon-invalid";

type MockRequest = {
  scenario?: MockScenario;
  productType?: string;
  asin?: string | null;
  attributes?: Record<string, unknown>;
};

function responseForScenario(scenario: MockScenario, productType: string, asin: string | null, attributes: Record<string, unknown>) {
  const base = {
    validationPreview: true,
    mock: true,
    productType,
    asin,
    draft: { productType, attributes },
  };

  if (scenario === "missing-required") {
    return {
      ...base,
      success: false,
      requiresAmazonAttributes: true,
      missingAttributes: [
        { name: "externally_assigned_product_identifier" },
        { name: "supplier_declared_dg_hz_regulation" },
      ],
      error: "Mock Amazon validation requires additional product information.",
    };
  }

  if (scenario === "catalog-mismatch") {
    return {
      ...base,
      success: false,
      amazon: {
        status: "INVALID",
        issues: [
          {
            code: "8541",
            attributeName: "product_type",
            message: "The submitted product type does not match the selected catalog item.",
          },
        ],
      },
      error: "Mock catalog identity/product type mismatch.",
    };
  }

  if (scenario === "amazon-invalid") {
    return {
      ...base,
      success: false,
      amazon: {
        status: "INVALID",
        issues: [
          {
            code: "90183",
            attributeName: "purchasable_offer",
            message: "The submitted offer contains invalid values.",
          },
        ],
      },
      error: "Mock Amazon offer validation failed.",
    };
  }

  return {
    ...base,
    success: true,
    amazon: {
      status: "VALID",
      issues: [],
      submissionId: "MOCK-SUBMISSION-001",
    },
    error: null,
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as MockRequest;
    const scenario: MockScenario = body.scenario || "valid";
    const allowed: MockScenario[] = ["valid", "missing-required", "catalog-mismatch", "amazon-invalid"];

    if (!allowed.includes(scenario)) {
      return NextResponse.json({ success: false, error: "Unsupported mock scenario" }, { status: 400 });
    }

    const productType = body.productType?.trim() || "ABRASIVE_SHEETS";
    const asin = body.asin?.trim().toUpperCase() || null;
    const attributes = body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)
      ? body.attributes
      : {};

    const result = responseForScenario(scenario, productType, asin, attributes);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Mock Amazon validation failed" },
      { status: 400 },
    );
  }
}
