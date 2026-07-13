import { createEvent } from "@/lib/events";
import { PoolClient } from "pg";

export async function createBillingEvent(
  event: string,
  entityId: number,
  userId: number | undefined,
  payload: any,
  client?: PoolClient,
) {
  return createEvent(
    event,
    "subscription",
    entityId,
    userId,
    payload,
    client,
  );
}