import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getMarketingAsset } from "@/lib/marketing/assets";

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId <= 0) return errorResponse("Invalid id");
  const asset = await getMarketingAsset(Number((session.user as any).id), mediaId);
  if (!asset) return errorResponse("Asset not found", 404);
  return Response.json({ asset });
}
