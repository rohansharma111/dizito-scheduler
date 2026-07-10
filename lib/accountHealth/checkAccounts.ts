import { pool } from "@/lib/db";

async function checkInstagramAccount(account: any) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me?access_token=${account.access_token}`,
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  await pool.query(
    `
    UPDATE social_accounts
    SET
      status = 'connected',
      health_status = 'healthy',
      last_checked_at = NOW()
    WHERE id = $1
    `,
    [account.id],
  );

  return {
    status: "healthy",
  };
}

async function checkFacebookAccount(account: any) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me?access_token=${account.page_access_token}`,
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  await pool.query(
    `
    UPDATE social_accounts
    SET
      status = 'connected',
      health_status = 'healthy',
      last_checked_at = NOW()
    WHERE id = $1
    `,
    [account.id],
  );

  return {
    status: "healthy",
  };
}

async function checkLinkedInAccount(account: any) {
  const response = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (!response.ok) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  await pool.query(
    `
    UPDATE social_accounts
    SET
      status = 'connected',
      health_status = 'healthy',
      last_checked_at = NOW()
    WHERE id = $1
    `,
    [account.id],
  );

  return {
    status: "healthy",
  };
}

async function checkPinterestAccount(account: any) {
  const response = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok || data.code || data.message) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  await pool.query(
    `
    UPDATE social_accounts
    SET
      status = 'connected',
      health_status = 'healthy',
      last_checked_at = NOW()
    WHERE id = $1
    `,
    [account.id],
  );

  return {
    status: "healthy",
  };
}

async function checkGoogleBusinessAccount(account: any) {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${account.google_account_id}/${account.google_location_id}`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  let data: any = {};

  try {
    data = await response.json();
  } catch {}

  if (!response.ok || data.error) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  const accounts = Array.isArray(data.accounts) ? data.accounts : [];

  const exists = accounts.some(
    (a: any) => a.name === account.google_account_id,
  );

  if (!exists) {
    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'expired',
        health_status = 'expired',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "expired",
    };
  }

  await pool.query(
    `
    UPDATE social_accounts
    SET
      status = 'connected',
      health_status = 'healthy',
      last_checked_at = NOW()
    WHERE id = $1
    `,
    [account.id],
  );

  return {
    status: "healthy",
  };
}

async function checkAccount(account: any) {
  try {
    switch (account.platform?.toLowerCase()) {
      case "instagram":
        return await checkInstagramAccount(account);

      case "facebook":
        return await checkFacebookAccount(account);

      case "linkedin":
        return await checkLinkedInAccount(account);

      case "pinterest":
        return await checkPinterestAccount(account);

      case "google_business":
        return await checkGoogleBusinessAccount(account);

      default:
        return {
          status: "unsupported",
        };
    }
  } catch (error) {
    console.error(`Health check failed for account ${account.id}`, error);

    await pool.query(
      `
      UPDATE social_accounts
      SET
        status = 'error',
        health_status = 'failed',
        last_checked_at = NOW()
      WHERE id = $1
      `,
      [account.id],
    );

    return {
      status: "error",
    };
  }
}

export async function checkAccounts(userId?: number) {
  const query = userId
    ? `
      SELECT *
      FROM social_accounts
      WHERE
        user_id = $1
      ORDER BY
        last_checked_at
        NULLS FIRST
      `
    : `
      SELECT *
      FROM social_accounts
      WHERE
        status = 'connected'
        AND
        (
          last_checked_at IS NULL
          OR
          last_checked_at <
              NOW() - INTERVAL '6 hours'
        )
      ORDER BY
        last_checked_at
        NULLS FIRST
      LIMIT 20
      `;

  const result = await pool.query(query, userId ? [userId] : []);

  const summary = {
    total: 0,
    healthy: 0,
    expired: 0,
    error: 0,
  };

  for (const account of result.rows) {
    summary.total++;

    const health = await checkAccount(account);

    if (health.status === "healthy") {
      summary.healthy++;
    }

    if (health.status === "expired") {
      summary.expired++;
    }

    if (health.status === "error") {
      summary.error++;
    }
  }

  return summary;
}
