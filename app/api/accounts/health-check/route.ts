import { checkAccounts } from "@/lib/accountHealth/checkAccounts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAccounts((session.user as any).id);

  return Response.json({
    success: true,
    ...result,
  });
}