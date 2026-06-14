export async function GET(
  request: Request
) {

  const { searchParams } =
    new URL(request.url);

  const reconnect =
    searchParams.get(
      "reconnect"
    );

  const state =
    reconnect
      ? `reconnect:${reconnect}`
      : "connect";

  const url =
    `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI!)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish&state=${state}`;

  return Response.redirect(
    url
  );

}