import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { BillingRepository } from "@/lib/billing/repository";
import PricingButton from "@/components/billing/PricingButton";

const fallbackPlans = [
  { code: "free", name: "Free", price_minor: 0, trial_days: 0, description: "Start exploring Dizito.", social: 3, publishing: 50, ai: 25 },
  { code: "growth", name: "Growth", price_minor: 79900, trial_days: 7, description: "For growing businesses.", social: 10, publishing: 500, ai: 250 },
  { code: "pro", name: "Pro", price_minor: 199900, trial_days: 7, description: "For businesses running a serious growth engine.", social: 25, publishing: 2000, ai: 1000 },
];

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const plans = await BillingRepository.listPublicPlans();
  const planRows = plans.length
    ? await Promise.all(plans.map(async (plan) => {
        const values = await pool.query(
          `SELECT be.key, bpe.value
           FROM billing_plan_entitlement_values bpe
           JOIN billing_entitlement_definitions be ON be.id = bpe.entitlement_id
           WHERE bpe.plan_id = $1`,
          [plan.id],
        );
        const map = Object.fromEntries(values.rows.map((row) => [row.key, row.value]));
        return { ...plan, social: Number(map["channels.social.max"] ?? 0), publishing: Number(map["publishing.monthly.max"] ?? 0), ai: Number(map["ai.actions.monthly.max"] ?? 0) };
      }))
    : fallbackPlans;
  const currentPlan = session?.user
    ? (await pool.query("SELECT plan FROM users WHERE id = $1", [(session.user as any).id])).rows[0]?.plan ?? "free"
    : null;
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-6xl text-center">
        <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">V1 pricing hypothesis — subject to beta validation</div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight">Plans built around the Dizito operating loop.</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg text-gray-600">Business Brain, strategy, creation, weekly planning, optimization and commerce capabilities scale with your plan.</p>
      </section>
      <section className="mx-auto mt-14 grid max-w-6xl gap-6 lg:grid-cols-3">
        {planRows.map((plan: any) => {
          const isCurrent = currentPlan === plan.code || (currentPlan === "creator" && ["growth", "pro"].includes(plan.code));
          const paid = plan.code !== "free";
          const price = Math.round(Number(plan.price_minor) / 100);
          return (
            <article key={plan.code} className={`rounded-2xl border bg-white p-7 shadow-sm ${plan.code === "growth" ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}>
              {plan.code === "growth" && <div className="mb-5 inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Recommended</div>}
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-gray-500">{plan.description}</p>
              <div className="mt-7 flex items-end gap-2"><span className="text-5xl font-bold">₹{price}</span><span className="pb-2 text-gray-500">{price === 0 ? "forever" : "/month"}</span></div>
              {plan.trial_days > 0 && <p className="mt-2 text-sm font-medium text-green-700">{plan.trial_days}-day trial hypothesis</p>}
              <div className="mt-8 space-y-3 text-sm">
                <div>✓ {plan.social} social channels</div><div>✓ {plan.publishing} publishing actions / month</div><div>✓ {plan.ai} AI actions / month</div><div>✓ Business Brain</div>
                <div>{plan.code === "free" ? "—" : "✓"} Strategy + Generate My Week</div><div>{plan.code === "pro" ? "✓" : "—"} Optimizer</div><div>{plan.code === "free" ? "—" : "✓"} Commerce</div>
              </div>
              {isCurrent ? <div className="mt-9 rounded-lg bg-gray-100 px-6 py-3 text-center font-medium">Current plan</div> : <PricingButton plan={plan.code as "free" | "growth" | "pro"} href={session ? "/dashboard" : "/login"} label={!session ? "Start Free" : paid ? `Choose ${plan.name}` : "Start Free"} popular={plan.code === "growth"} />}
            </article>
          );
        })}
      </section>
      <section className="mx-auto mt-10 max-w-6xl rounded-2xl border bg-white p-7 text-sm text-gray-600">Agency (₹4,999+ hypothesis) and Founding Beta (₹499 hypothesis) remain controlled catalog entries rather than public checkout plans.</section>
      <div className="mx-auto mt-8 max-w-6xl text-center"><Link href={session ? "/settings/billing" : "/login"} className="text-sm font-medium text-blue-700">{session ? "Manage your subscription →" : "Sign in to manage billing →"}</Link></div>
    </main>
  );
}
