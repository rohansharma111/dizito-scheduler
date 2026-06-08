import { publishToInstagram } from "@/lib/publishers/instagram";

export async function GET() {
  const result = await publishToInstagram(8);

  return Response.json(result);
}