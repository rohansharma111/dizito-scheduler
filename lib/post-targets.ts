import { pool } from "@/lib/db";

export async function createTarget(
  postId: number,
  socialAccountId: number,
  platform: string
) {
  return pool.query(
    `
    INSERT INTO post_targets
    (
      post_id,
      social_account_id,
      platform
    )
    VALUES
    (
      $1,
      $2,
      $3
    )
    `,
    [
      postId,
      socialAccountId,
      platform,
    ]
  );
}