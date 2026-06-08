export async function GET(
  request: Request
) {

  const { searchParams } =
    new URL(request.url);

  const code =
    searchParams.get("code");

  const response =
    await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI!)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );

  const data =
    await response.json();

  return Response.json(data);

}