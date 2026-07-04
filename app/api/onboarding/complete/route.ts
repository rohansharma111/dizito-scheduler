import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const userId = (session.user as any).id;

  await pool.query(
    `
    UPDATE users
    SET
      onboarding_completed = true,
      onboarding_step = 4
    WHERE id = $1
    `,
    [userId],
  );

  return Response.json({
    success: true,
  });
}
