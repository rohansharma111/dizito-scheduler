import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlan } from "@/lib/plans";

export async function GET() {
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

  /*
    Accounts
  */
  const accountResult = await pool.query(
    `
      SELECT
        id,
        account_name,
        platform,
        status,
        last_checked_at,
        created_at
      FROM social_accounts
      WHERE user_id = $1
      ORDER BY id DESC
      `,
    [userId],
  );

  /*
    User plan
  */
  const userResult = await pool.query(
    `
      SELECT
        plan
      FROM users
      WHERE id = $1
      `,
    [userId],
  );

  const userPlan = userResult.rows[0]?.plan || "free";

  const plan = getPlan(userPlan);

  return Response.json({
    accounts: accountResult.rows,

    user: {
      plan: userPlan,
    },

    limits: {
      used: accountResult.rows.length,

      allowed: plan.accounts,
    },
  });
}
