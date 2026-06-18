import { publishToLinkedIn } from "@/lib/publishers/linkedin";

export async function GET() {
  const result = await publishToLinkedIn(5);

  return Response.json(result);
}
