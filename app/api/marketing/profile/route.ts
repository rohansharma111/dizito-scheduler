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
      `SELECT id, business_name, business_type, industry, description, website_url,
              location, timezone, brand_voice, created_at, updated_at
       FROM marketing_business_profiles
       WHERE user_id = $1`,
      [userId],
    );

    return Response.json({ profile: result.rows[0] ?? null });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    if (!businessName) {
      return Response.json({ error: "businessName is required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO marketing_business_profiles
        (user_id, business_name, business_type, industry, description, website_url, location, timezone, brand_voice)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        business_type = EXCLUDED.business_type,
        industry = EXCLUDED.industry,
        description = EXCLUDED.description,
        website_url = EXCLUDED.website_url,
        location = EXCLUDED.location,
        timezone = EXCLUDED.timezone,
        brand_voice = EXCLUDED.brand_voice,
        updated_at = now()
       RETURNING id, business_name, business_type, industry, description, website_url,
                 location, timezone, brand_voice, created_at, updated_at`,
      [
        userId,
        businessName,
        body.businessType ?? null,
        body.industry ?? null,
        body.description ?? null,
        body.websiteUrl ?? null,
        body.location ?? null,
        body.timezone ?? null,
        body.brandVoice ?? null,
      ],
    );

    return Response.json({ profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
