export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url);

  const code =
    searchParams.get("code");

  const response =
    await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          grant_type:
            "authorization_code",

          code: code || "",

          client_id:
            process.env
              .LINKEDIN_CLIENT_ID || "",

          client_secret:
            process.env
              .LINKEDIN_CLIENT_SECRET || "",

          redirect_uri:
            process.env
              .LINKEDIN_REDIRECT_URI || "",
        }),
      }
    );

  const data =
    await response.json();

  return Response.json(data);
}