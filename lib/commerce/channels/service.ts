import { pool } from "@/lib/db";

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

/** Internal provider lookup. Callers must already have authenticated/authorized the channel. */
export async function getCommerceChannelByIdInternal(channelId: string) {
  const result = await pool.query(
    `
    SELECT id, user_id, provider, name, external_account_id, status, metadata, created_at, updated_at
    FROM commerce_channels
    WHERE id = $1
    LIMIT 1
    `,
    [channelId],
  );
  return result.rows[0] ?? null;
}

export async function createCommerceChannel(
  userId: number,
  input: CreateCommerceChannelInput,
) {
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
}

export async function updateCommerceChannel(
  channelId: string,
  userId: number,
  input: UpdateCommerceChannelInput,
) {
  const existing = await getCommerceChannelById(channelId, userId);
  if (!existing) return null;

  const metadata =
    input.metadata === undefined
      ? existing.metadata ?? {}
      : {
          ...(existing.metadata ?? {}),
          ...input.metadata,
        };

  const result = await pool.query(
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
  return result.rows[0] ?? null;
}
