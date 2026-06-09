import {
  publishToFacebook
}
from "@/lib/publishers/facebook";

export async function GET() {

  const result =
    await publishToFacebook(1);

  return Response.json(result);

}