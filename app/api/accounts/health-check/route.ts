import { checkAccounts } from "@/lib/accountHealth/checkAccounts";

export async function GET() {
  const result = await checkAccounts();

  return Response.json({
    success: true,
    ...result,
  });
}