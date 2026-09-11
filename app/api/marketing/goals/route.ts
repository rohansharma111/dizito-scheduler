import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any).id : null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `SELECT id, name, goal_type, description, priority, status, target_value,
              target_period, created_at, updated_at
       FROM marketing_goals
       WHERE user_id = $1
       ORDER BY priority ASC, id ASC`,
      [userId],
    );

    return Response.json({ goals: result.rows });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const goalType = typeof body.goalType === "string" ? body.goalType.trim() : "";
    if (!name || !goalType) {
      return Response.json({ error: "name and goalType are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO marketing_goals
        (user_id, name, goal_type, description, priority, status, target_value, target_period)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'active'),$7,$8)
       RETURNING id, name, goal_type, description, priority, status, target_value,
                 target_period, created_at, updated_at`,
      [
        userId,
        name,
        goalType,
        body.description ?? null,
        body.priority ?? 1,
        body.status ?? null,
        body.targetValue ?? null,
        body.targetPeriod ?? null,
      ],
    );

    return Response.json({ goal: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
