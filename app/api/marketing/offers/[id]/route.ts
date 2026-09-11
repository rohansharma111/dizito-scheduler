import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any).id : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const offerId = Number(params.id);
    if (!Number.isInteger(offerId) || offerId <= 0) {
      return Response.json({ error: "Invalid offer id" }, { status: 400 });
    }

    const body = await request.json();
    const result = await pool.query(
      `UPDATE marketing_offers
       SET name = COALESCE($1, name),
           offer_type = COALESCE($2, offer_type),
           description = COALESCE($3, description),
           terms = COALESCE($4, terms),
           code = COALESCE($5, code),
           starts_at = COALESCE($6, starts_at),
           ends_at = COALESCE($7, ends_at),
           status = COALESCE($8, status),
           updated_at = now()
       WHERE id = $9 AND user_id = $10
       RETURNING id, name, offer_type, description, terms, code, starts_at, ends_at,
                 status, created_at, updated_at`,
      [
        body.name ?? null,
        body.offerType ?? null,
        body.description ?? null,
        body.terms ?? null,
        body.code ?? null,
        body.startsAt ?? null,
        body.endsAt ?? null,
        body.status ?? null,
        offerId,
        userId,
      ],
    );

    if (!result.rowCount) return Response.json({ error: "Offer not found" }, { status: 404 });
    return Response.json({ offer: result.rows[0] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
