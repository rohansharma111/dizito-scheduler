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
    Load post + media
  */

  const postResult = await pool.query(
    `
      SELECT
        p.*,

        m.id AS media_id,

        m.secure_url,

        m.cloudinary_public_id,

        m.file_name,

        m.mime_type,

        m.resource_type,

        m.format,

        m.width,

        m.height,

        m.bytes,

        m.media_type,
        m.duration_seconds,
        m.poster_url,
        m.processing_state,
        m.upload_protocol,
        m.processing_error,
        m.metadata

      FROM posts p

      LEFT JOIN media_library m
        ON p.media_id = m.id
        AND m.user_id = p.user_id
        AND m.deleted_at IS NULL

      WHERE p.id = $1
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
