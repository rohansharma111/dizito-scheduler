export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  /*
    reconnect=accountId
    type=facebook|instagram
  */

  const reconnect = searchParams.get("reconnect");

  const reconnectType = searchParams.get("type");

  let state = "connect";

  /*
    STRICT RECONNECT

    Examples:

    reconnect=12&type=instagram
    ->
    reconnect:12:instagram

    reconnect=5&type=facebook
    ->
    reconnect:5:facebook
  */
  if (reconnect && reconnectType) {
    state = `reconnect:${reconnect}:${reconnectType}`;
  }

  /*
    Meta OAuth URL
  */
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,

    redirect_uri: process.env.META_REDIRECT_URI!,

    response_type: "code",

    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
    ].join(","),

    state,
  });

  const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

  return Response.redirect(url);
}
