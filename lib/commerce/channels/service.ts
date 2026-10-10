import { pool } from "@/lib/db";
import { getEntitlement } from "@/lib/billing/entitlements";
import { BILLING_ENTITLEMENT_KEYS } from "@/lib/billing/catalog";

export type CommerceChannelStatus = "active" | "inactive" | "error";

export interface CreateCommerceChannelInput {
  provider: string;
  name: string;
  externalAccountId?: string | null;
  status?: CommerceChannelStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateCommerceChannelInput {
  name?: string;
  externalAccountId?: string | null;
  status?: CommerceChannelStatus;
  metadata?: Record<string, unknown>;
}

export async function getCommerceChannelCapacity(userId: number) {
  const [countResult, limitValue] = await Promise.all([
    pool.query(
      "SELECT COUNT(*)::int AS count FROM commerce_channels WHERE user_id = $1 AND status = 'active'",
      [userId],
    ),
    getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.commerceChannels),
  ]);
  const used = Number(countResult.rows[0]?.count ?? 0);
  const limit = typeof limitValue === "number" ? limitValue : Number(limitValue ?? 0);
  return { used, limit, allowed: used < limit };
}

export async function getCommerceChannels(userId: number) {
  const result = await pool.query(
    `
    SELECT id, provider, name, external_account_id, status, metadata, created_at, updated_at
    FROM commerce_channels
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId],
  );
  return result.rows;
}

export async function getCommerceChannelById(channelId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT id, provider, name, external_account_id, status, metadata, created_at, updated_at
    FROM commerce_channels
    WHERE id = $1 AND user_id = $2
    LIMIT 1
    `,
    [channelId, userId],
  );
  return result.rows[0] ?? null;
}

export async function getCommerceChannelByExternalAccount(
  userId: number,
  provider: string,
  externalAccountId: string,
) {
  const result = await pool.query(
    `
    SELECT id, user_id, provider, name, external_account_id, status, metadata, created_at, updated_at
    FROM commerce_channels
    WHERE user_id = $1 AND provider = $2 AND external_account_id = $3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId, provider, externalAccountId],
  );
  return result.rows[0] ?? null;
}

export async function createCommerceChannel(
  userId: number,
  input: CreateCommerceChannelInput,
) {
  try {
    const result = await pool.query(
      `
      INSERT INTO commerce_channels
        (user_id, provider, name, external_account_id, status, metadata)
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING id, provider, name, external_account_id, status, metadata, created_at, updated_at
      `,
      [
        userId,
        input.provider,
        input.name,
        input.externalAccountId ?? null,
        input.status ?? "active",
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  } catch (error) {
    if ((error as { code?: string }).code !== "23505" || input.externalAccountId == null) {
      throw error;
    }

    // OAuth callbacks can race (for example, a user reconnecting while a
    // provider retries the callback). The unique channel identity constraint
    // makes one row authoritative; return it instead of creating a duplicate.
    return getCommerceChannelByExternalAccount(
      userId,
      input.provider,
      input.externalAccountId,
    );
  }
}

export async function updateCommerceChannel(
  channelId: string,
  userId: number,
  input: UpdateCommerceChannelInput,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT id, provider, name, external_account_id, status, metadata, created_at, updated_at
      FROM commerce_channels
      WHERE id = $1 AND user_id = $2
      FOR UPDATE
      `,
      [channelId, userId],
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    const metadata =
      input.metadata === undefined
        ? existing.metadata ?? {}
        : {
            ...(existing.metadata ?? {}),
            ...input.metadata,
          };

    const result = await client.query(
      `
      UPDATE commerce_channels
      SET
        name = $1,
        external_account_id = $2,
        status = $3,
        metadata = $4::jsonb,
        updated_at = now()
      WHERE id = $5 AND user_id = $6
      RETURNING id, provider, name, external_account_id, status, metadata, created_at, updated_at
      `,
      [
        input.name ?? existing.name,
        input.externalAccountId !== undefined ? input.externalAccountId : existing.external_account_id,
        input.status ?? existing.status,
        JSON.stringify(metadata),
        channelId,
        userId,
      ],
    );

    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);

    if ((error as { code?: string }).code === "23505") {
      return { error: "CHANNEL_IDENTITY_CONFLICT" as const };
    }

    throw error;
  } finally {
    client.release();
  }
}
