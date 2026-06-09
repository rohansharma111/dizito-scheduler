import { pool } from "@/lib/db";

export async function GET() {

  const result =
    await pool.query(
      `
      SELECT
        id,
        account_name
      FROM social_accounts
      ORDER BY id
      `
    );

  return Response.json(
    result.rows
  );

}