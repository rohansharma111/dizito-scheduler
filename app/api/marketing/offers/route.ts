import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any).id : null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `SELECT id, name, offer_type, description, terms, code, starts_at, ends_at,
              status, created_at, updated_at
       FROM marketing_offers
       WHERE user_id = $1
       ORDER BY COALESCE(starts_at, created_at) DESC, id DESC`,
      [userId],
    );

    return Response.json({ offers: result.rows });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const offerType = typeof body.offerType === "string" ? body.offerType.trim() : "";
    if (!name || !offerType) {
      return Response.json({ error: "name and offerType are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO marketing_offers
        (user_id, name, offer_type, description, terms, code, starts_at, ends_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'draft'))
       RETURNING id, name, offer_type, description, terms, code, starts_at, ends_at,
                 status, created_at, updated_at`,
      [
        userId,
        name,
        offerType,
        body.description ?? null,
        body.terms ?? null,
        body.code ?? null,
        body.startsAt ?? null,
        body.endsAt ?? null,
        body.status ?? null,
      ],
    );

    return Response.json({ offer: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
