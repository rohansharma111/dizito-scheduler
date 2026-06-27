import { pool } from "../db";
import { publishers } from "../publishers";

export async function processTarget(target: any) {
  console.log(`Processing Target ${target.id} (${target.platform})`);

  /*
    Find publisher
  */

  const publisher =
    publishers[target.platform.toLowerCase() as keyof typeof publishers];

  if (!publisher) {
    throw new Error(`Unsupported platform: ${target.platform}`);
  }

  /*
    Load post
  */

  const postResult = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
    [target.post_id],
  );

  const post = postResult.rows[0];

  if (!post) {
    throw new Error("Post not found");
  }

  /*
    Load account
  */

  const accountResult = await pool.query(
    `
      SELECT *
      FROM social_accounts
      WHERE id = $1
      `,
    [target.social_account_id],
  );

  const account = accountResult.rows[0];

  if (!account) {
    throw new Error("Account not found");
  }

  /*
    Build publisher context
  */

  const context = {
    post,
    target,
    account,
  };

  /*
    Publish
  */

  await publisher(context);

  /*
    Return everything
  */

  return {
    post,
    target,
    account,
    userId: post.user_id,
  };
}
