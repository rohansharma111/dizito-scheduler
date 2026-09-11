import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any).id : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const goalId = Number(params.id);
    if (!Number.isInteger(goalId) || goalId <= 0) {
      return Response.json({ error: "Invalid goal id" }, { status: 400 });
    }

    const body = await request.json();
    const result = await pool.query(
      `UPDATE marketing_goals
       SET name = COALESCE($1, name),
           goal_type = COALESCE($2, goal_type),
           description = COALESCE($3, description),
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           target_value = COALESCE($6, target_value),
           target_period = COALESCE($7, target_period),
           updated_at = now()
       WHERE id = $8 AND user_id = $9
       RETURNING id, name, goal_type, description, priority, status, target_value,
                 target_period, created_at, updated_at`,
      [
        body.name ?? null,
        body.goalType ?? null,
        body.description ?? null,
        body.priority ?? null,
        body.status ?? null,
        body.targetValue ?? null,
        body.targetPeriod ?? null,
        goalId,
        userId,
      ],
    );

    if (!result.rowCount) return Response.json({ error: "Goal not found" }, { status: 404 });
    return Response.json({ goal: result.rows[0] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
