import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteProduct, getProductDetails, updateProduct } from "@/lib/commerce/products/service";

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params; if (!id) return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    const product = await getProductDetails(id, Number(session.user.id)); if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, product });
  } catch (error) { console.error("GET /api/products/[id] error:", error); return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params; if (!id) return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    const body = await request.json();
    const input: { name?: string; description?: string | null; brand?: string | null; category?: string | null; hsnCode?: string | null; status?: string } = {};
    if (body.name !== undefined) { if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ success: false, error: "Product name cannot be empty" }, { status: 400 }); input.name = body.name.trim(); }
    if (body.description !== undefined) input.description = body.description === null ? null : String(body.description).trim();
    if (body.brand !== undefined) input.brand = body.brand === null ? null : String(body.brand).trim();
    if (body.category !== undefined) input.category = body.category === null ? null : String(body.category).trim();
    if (body.hsnCode !== undefined) {
      const value = body.hsnCode === null ? "" : String(body.hsnCode).trim();
      if (value && !/^\d{4,8}$/.test(value)) return NextResponse.json({ success: false, error: "HSN code must contain 4 to 8 digits" }, { status: 400 });
      input.hsnCode = value || null;
    }
    if (body.status !== undefined) { const allowed = ["draft", "active", "archived"]; if (typeof body.status !== "string" || !allowed.includes(body.status)) return NextResponse.json({ success: false, error: "Invalid product status" }, { status: 400 }); input.status = body.status; }
    const product = await updateProduct(id, Number(session.user.id), input); if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, product });
  } catch (error) { console.error("PATCH /api/products/[id] error:", error); return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params; if (!id) return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    const deleted = await deleteProduct(id, Number(session.user.id)); if (!deleted) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("DELETE /api/products/[id] error:", error); return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 }); }
}
