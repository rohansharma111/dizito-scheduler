import {
  publishToFacebook
}
from "@/lib/publishers/facebook";

export async function GET() {

  const result =
    await publishToFacebook(34);

  return Response.json(result);

}