import { pool } from "@/lib/db";

export async function GET() {

  const accounts =
    await pool.query(
      `
      SELECT *
      FROM social_accounts
      `
    );

  for (
    const account
    of accounts.rows
  ) {

    try {

      const response =
        await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${account.access_token}`
        );

      const data =
        await response.json();

      if (data.error) {

        await pool.query(
          `
          UPDATE social_accounts
          SET
            status = 'expired',
            last_checked_at = NOW()
          WHERE id = $1
          `,
          [account.id]
        );

      } else {

        await pool.query(
          `
          UPDATE social_accounts
          SET
            status = 'connected',
            last_checked_at = NOW()
          WHERE id = $1
          `,
          [account.id]
        );

      }

    } catch {

      await pool.query(
        `
        UPDATE social_accounts
        SET
          status = 'error',
          last_checked_at = NOW()
        WHERE id = $1
        `,
        [account.id]
      );

    }

  }

  return Response.json({
    success: true,
  });

}