import { pool } from "@/lib/db";
import { startScheduler } from "@/lib/scheduler";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlan, canCreatePost } from "@/lib/plans";
import { createEvent } from "@/lib/events";

startScheduler();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const result = await pool.query(
    `
  SELECT
    p.*,

    COALESCE(
      json_agg(
        json_build_object(
          'id', pt.id,
          'post_id', pt.post_id,
          'social_account_id', pt.social_account_id,
          'platform', pt.platform,
          'status', pt.status,
          'publish_message', pt.publish_message,
          'published_at', pt.published_at
        )
      ) FILTER (
        WHERE pt.id IS NOT NULL
      ),
      '[]'
    ) AS targets

  FROM posts p

  LEFT JOIN post_targets pt
    ON pt.post_id = p.id

  WHERE p.user_id = $1

  GROUP BY p.id

  ORDER BY p.id DESC
  `,
    [(session.user as any).id],
  );

  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const userId = (session.user as any).id;

  /*
    VALIDATE STATUS
  */

  const allowedStatuses = ["draft", "scheduled"];

  const status = body.status || "scheduled";

  if (!allowedStatuses.includes(status)) {
    return Response.json(
      {
        error: "Invalid status",
      },
      {
        status: 400,
      },
    );
  }

  /*
    SCHEDULE REQUIRED
  */

  if (status === "scheduled" && !body.scheduleTime) {
    return Response.json(
      {
        error: "Schedule time is required",
      },
      {
        status: 400,
      },
    );
  }

  /*
    ACCOUNT REQUIRED
  */

  if (!body.selectedAccounts || body.selectedAccounts.length === 0) {
    return Response.json(
      {
        error: "Select at least one account",
      },
      {
        status: 400,
      },
    );
  }

  /*
    VERIFY OWNERSHIP
  */

  const accounts = await pool.query(
    `
      SELECT *
      FROM social_accounts
      WHERE
        id = ANY($1)
        AND user_id = $2
      `,
    [body.selectedAccounts, userId],
  );

  if (accounts.rows.length !== body.selectedAccounts.length) {
    return Response.json(
      {
        error: "Invalid account selection",
      },
      {
        status: 400,
      },
    );
  }

  /*
    LOAD USER PLAN
  */

  const userResult = await pool.query(
    `
      SELECT plan
      FROM users
      WHERE id = $1
      `,
    [userId],
  );

  const userPlan = userResult.rows[0]?.plan || "free";

  const plan = getPlan(userPlan);

  /*
    COUNT POSTS THIS MONTH
    (exclude drafts)
  */

  const monthlyPosts = await pool.query(
    `
      SELECT COUNT(*)
      FROM posts
      WHERE
        user_id = $1
        AND status IN
        (
          'scheduled',
          'published',
          'failed'
        )
        AND created_at >=
            date_trunc(
              'month',
              NOW()
            )
      `,
    [userId],
  );

  const currentPosts = Number(monthlyPosts.rows[0].count);

  /*
    ENFORCE PLAN
  */

  if (!canCreatePost(userPlan, currentPosts)) {
    await createEvent("PLAN_LIMIT_REACHED", "user", userId, userId, {
      type: "posts",

      plan: userPlan,

      currentPosts,

      maxPosts: plan.monthlyPosts,
    });

    return Response.json(
      {
        error: `Your ${plan.name} plan allows only ${plan.monthlyPosts} posts per month. Please upgrade your plan.`,
      },
      {
        status: 403,
      },
    );
  }

  /*
    TRANSACTION
  */

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
      CREATE POST
    */

    const postResult = await client.query(
      `
        INSERT INTO posts
        (
          post,
          schedule_time,
          status,
          image_url,
          user_id
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING *
        `,
      [body.post, body.scheduleTime, status, body.imageUrl, userId],
    );

    const post = postResult.rows[0];

    /*
      CREATE TARGETS
    */

    for (const account of accounts.rows) {
      await client.query(
        `
        INSERT INTO post_targets
        (
          post_id,
          social_account_id,
          platform,
          status
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4
        )
        `,
        [post.id, account.id, account.platform, status],
      );
    }

    await client.query("COMMIT");

    /*
      AUDIT EVENT
    */

    await createEvent("POST_CREATED", "post", post.id, userId, {
      status,

      targets: accounts.rows.length,

      plan: userPlan,
    });

    return Response.json({
      success: true,

      post,

      targets: accounts.rows.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    return Response.json(
      {
        error: "Failed to create post",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const body = await request.json();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  await pool.query(
    `
    DELETE FROM posts
    WHERE id = $1
    AND user_id = $2
    `,
    [body.id, (session.user as any).id],
  );

  return Response.json({
    success: true,
  });
}
