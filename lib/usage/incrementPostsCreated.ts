import { pool } from "@/lib/db";
import { getCurrentUsage } from "./getCurrentUsage";

export async function incrementPostsCreated(userId: number) {
  const usage = await getCurrentUsage(userId);

  await pool.query(
    `
    UPDATE user_usage
    SET
      posts_created =
        posts_created + 1,
      updated_at = NOW()
    WHERE id=$1
    `,
    [usage.id],
  );
}
