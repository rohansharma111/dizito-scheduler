import { pool } from "@/lib/db";
import { getCurrentUsage } from "./getCurrentUsage";

export async function incrementAIImagesGenerated(userId: number) {
  const usage = await getCurrentUsage(userId);

  await pool.query(
    `
    UPDATE user_usage
    SET
      ai_images_generated =
        ai_images_generated + 1,
      updated_at = NOW()
    WHERE id = $1
    `,
    [usage.id],
  );
}
