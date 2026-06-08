import { publishToInstagram } from "@/lib/publishers/instagram";

export async function GET() {
  const result = await publishToInstagram(10);

  return Response.json({
  success: true,
  result,
});
}