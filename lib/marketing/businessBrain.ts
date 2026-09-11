import { pool } from "@/lib/db";

export type BusinessBrain = {
  profile: {
    id: number;
    businessName: string;
    businessType: string | null;
    industry: string | null;
    description: string | null;
    websiteUrl: string | null;
    location: string | null;
    timezone: string | null;
    brandVoice: string | null;
  } | null;
  goals: Array<{
    id: number;
    name: string;
    goalType: string;
    description: string | null;
    priority: number;
    status: string;
    targetValue: string | null;
    targetPeriod: string | null;
  }>;
  offers: Array<{
    id: number;
    name: string;
    offerType: string;
    description: string | null;
    terms: string | null;
    code: string | null;
    startsAt: string | null;
    endsAt: string | null;
    status: string;
  }>;
  products: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  inventory: Array<{
    productId: number;
    variantId: number;
    quantityOnHand: number;
    quantityReserved: number;
  }>;
  media: Array<{
    id: number;
    fileName: string;
    secureUrl: string;
    resourceType: string;
    tags: string[];
  }>;
  socialAccounts: Array<{
    id: number;
    platform: string;
    accountName: string;
    status: string | null;
  }>;
  recentPosts: Array<{
    id: number;
    content: string;
    status: string;
    scheduleTime: string | null;
    createdAt: string;
  }>;
};

export async function getBusinessBrain(userId: number): Promise<BusinessBrain> {
  const [profile, goals, offers, products, inventory, media, socialAccounts, recentPosts] = await Promise.all([
    pool.query(
      `SELECT id, business_name, business_type, industry, description, website_url, location, timezone, brand_voice
       FROM marketing_business_profiles WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT id, name, goal_type, description, priority, status, target_value, target_period
       FROM marketing_goals WHERE user_id = $1 ORDER BY priority ASC, id ASC`,
      [userId],
    ),
    pool.query(
      `SELECT id, name, offer_type, description, terms, code, starts_at, ends_at, status
       FROM marketing_offers WHERE user_id = $1
       ORDER BY COALESCE(starts_at, created_at) DESC, id DESC`,
      [userId],
    ),
    pool.query(
      `SELECT id, name, description FROM products WHERE user_id = $1 ORDER BY id DESC`,
      [userId],
    ),
    pool.query(
      `SELECT ib.variant_id, pv.product_id, ib.quantity_on_hand, ib.quantity_reserved
       FROM inventory_balances ib
       JOIN product_variants pv ON pv.id = ib.variant_id
       WHERE ib.user_id = $1
       ORDER BY pv.product_id, ib.variant_id`,
      [userId],
    ),
    pool.query(
      `SELECT id, file_name, secure_url, resource_type, tags
       FROM media_library WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId],
    ),
    pool.query(
      `SELECT id, platform, account_name, status
       FROM social_accounts WHERE user_id = $1 ORDER BY platform, id`,
      [userId],
    ),
    pool.query(
      `SELECT id, post AS content, status, schedule_time, created_at
       FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
  ]);

  return {
    profile: profile.rows[0]
      ? {
          id: profile.rows[0].id,
          businessName: profile.rows[0].business_name,
          businessType: profile.rows[0].business_type,
          industry: profile.rows[0].industry,
          description: profile.rows[0].description,
          websiteUrl: profile.rows[0].website_url,
          location: profile.rows[0].location,
          timezone: profile.rows[0].timezone,
          brandVoice: profile.rows[0].brand_voice,
        }
      : null,
    goals: goals.rows.map((row) => ({
      id: row.id,
      name: row.name,
      goalType: row.goal_type,
      description: row.description,
      priority: row.priority,
      status: row.status,
      targetValue: row.target_value,
      targetPeriod: row.target_period,
    })),
    offers: offers.rows.map((row) => ({
      id: row.id,
      name: row.name,
      offerType: row.offer_type,
      description: row.description,
      terms: row.terms,
      code: row.code,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
    })),
    products: products.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
    })),
    inventory: inventory.rows.map((row) => ({
      productId: row.product_id,
      variantId: row.variant_id,
      quantityOnHand: Number(row.quantity_on_hand),
      quantityReserved: Number(row.quantity_reserved),
    })),
    media: media.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      secureUrl: row.secure_url,
      resourceType: row.resource_type,
      tags: row.tags ?? [],
    })),
    socialAccounts: socialAccounts.rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      accountName: row.account_name,
      status: row.status,
    })),
    recentPosts: recentPosts.rows.map((row) => ({
      id: row.id,
      content: row.content,
      status: row.status,
      scheduleTime: row.schedule_time,
      createdAt: row.created_at,
    })),
  };
}
