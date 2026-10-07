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

    reconnect=12&type=instagram
    -> reconnect:12:instagram

    reconnect=5&type=facebook
    -> reconnect:5:facebook
  */
  if (reconnect && reconnectType) {
    state = `reconnect:${reconnect}:${reconnectType}`;
  }

  /*
    Facebook Login for Business OAuth
  */
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,

    redirect_uri: process.env.META_REDIRECT_URI!,

    config_id: process.env.META_LOGIN_CONFIG_ID!,

    response_type: "code",

    state,
  });

  const url = `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

  return Response.redirect(url);
}
