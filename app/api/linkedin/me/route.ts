export async function GET() {

  const token =
    "AQVpjTXVvWg0Guq3Qrj_DY0uMJP22Gx4VLB1Px020hzQ5KQqwWRHyx72niw2qwXLsjR8GG3QFdIPlBLipYQKIxUNhuz8mBlc4Q2zUmiRcOa8nrQPsaLzbtxt73gEv8HYo9cbB4FLzVY3_Cj7vfl6ymesZAOymsU-1sge_HlyF1FCUm87Jz39Z0GdtOytL0fn9SDuY7EltYjBiigzcvEa3U4s-l8SBigZ4GnLNrcI_W_ZWHBxZ7f83mM320hDp37siN2TvIKTsa-TeICNgYO_5iuISXKxOZHxEmv_GocWg_YAXWh2adtJ3oMIBgMQm0dLe4Q9xKuxpMxqu9fPnqkEAk7rRX0V7A";

  const response =
    await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const data =
    await response.json();

  return Response.json(data);
}