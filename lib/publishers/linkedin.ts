export async function publishToLinkedIn(
  accessToken: string,
  memberId: string,
  text: string
) {

  const response = await fetch(
    "https://api.linkedin.com/rest/posts",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202506",

      },

      body: JSON.stringify({
        author: `urn:li:person:${memberId}`,

        lifecycleState: "PUBLISHED",

        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text,
            },

            shareMediaCategory: "NONE",
          },
        },

        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility":
            "PUBLIC",
        },
      }),
    }
  );

  const data = await response.json();

  console.log(data);

  return data;
}