export async function GET() {

  const token =
    "EAAOO0cbcN7MBRgLnCMbBSF4E14o6FjyixN8I593axzSyVN7zjisP7VmmeKO4A0Y8tu84Vx7dtL5EC6YYbE7dATX3kHE3OhVsdxQK1WGsMJDLNNjV2x3gCxlgCzHaNnpaCePynxkQwx5gep53RYGMHHhHZBFk14P0ZCB9ZCuB0u1A1DSHffOirvV1OZBJYp1RcoGfsqwZD";

  const pageId =
    "100162872615147";

  const response =
    await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`
    );

  const data =
    await response.json();

  return Response.json(data);

}