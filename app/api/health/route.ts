import { pool } from "@/lib/db";

export async function GET() {

  const result =
    await pool.query(
      "SELECT NOW()"
    );

  return Response.json({
    success: true,
    time: result.rows[0],
  });

}