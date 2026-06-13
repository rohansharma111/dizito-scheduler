export async function GET() {
  const clientId = process.env.META_APP_ID;

  const redirectUri = process.env.META_REDIRECT_URI;

  const scope = [
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_content_publish",
    "business_management",
  ].join(",");

  const url =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=${scope}`;
  console.log("REDIRECT URI:", redirectUri);
  console.log("OAUTH URL:", url);
  return Response.redirect(url);
}
