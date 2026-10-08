import { pool } from "@/lib/db";
import { getCurrentUsage } from "./getCurrentUsage";
import { consumePublishing } from "@/lib/billing/enforce";

export async function incrementPostsPublished(userId: number) {
  await consumePublishing(userId);
  const usage = await getCurrentUsage(userId);

  await pool.query(
    `UPDATE user_usage
     SET posts_published = posts_published + 1, updated_at = NOW()
     WHERE id = $1`,
    [usage.id],
  );
}
