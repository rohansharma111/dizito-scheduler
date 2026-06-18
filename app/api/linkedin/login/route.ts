export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  const scope = "openid profile email w_member_social";

  const url =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return Response.redirect(url);
}
