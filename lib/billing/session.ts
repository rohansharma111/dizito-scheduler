export function getBillingUserId(session: { user?: { id?: string | number | null } | null }) {
  const raw = session.user?.id;
  const userId = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid authenticated user");
  }
  return userId;
}
