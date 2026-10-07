import { pool } from "@/lib/db";
import { getCurrentUsage } from "./getCurrentUsage";
import { consumeAIAction } from "@/lib/billing/enforce";

export async function incrementAIImagesGenerated(userId: number) {
  await consumeAIAction(userId);
  const usage = await getCurrentUsage(userId);

  await pool.query(
    `UPDATE user_usage
     SET ai_images_generated = COALESCE(ai_images_generated, 0) + 1, updated_at = NOW()
     WHERE id = $1`,
    [usage.id],
  );
}
