import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
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

function isMissingBillingRelation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let planRows: typeof fallbackPlans;

  try {
    const plans = await BillingRepository.listPublicPlans();
    planRows = plans.length
      ? await Promise.all(
          plans.map(async (plan) => {
            const values = await pool.query(
              `SELECT definition.key, plan_value.value
               FROM billing_plan_entitlement_values plan_value
               JOIN billing_entitlement_definitions definition
                 ON definition.id = plan_value.entitlement_id
               WHERE plan_value.plan_id = $1`,
              [plan.id],
            );
            const map = Object.fromEntries(values.rows.map((row) => [row.key, row.value]));
            return {
              ...plan,
              social: Number(map["channels.social.max"] ?? 0),
              publishing: Number(map["publishing.monthly.max"] ?? 0),
              ai: Number(map["ai.actions.monthly.max"] ?? 0),
            };
          }),
        )
      : fallbackPlans;
  } catch (error) {
    // Keep public pricing available before the canonical billing schema is present.
    // Do not hide unrelated database failures.
    if (!isMissingBillingRelation(error)) throw error;
    planRows = fallbackPlans;
  }

  const currentPlan = session?.user
    ? (await pool.query("SELECT plan FROM users WHERE id = $1", [(session.user as any).id])).rows[0]?.plan ?? "free"
    : null;

  return (
    <main className="relative isolate min-h-[70vh] overflow-hidden bg-[#f8f9f6] px-5 py-14 text-[#171923] sm:px-8 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-44 size-[32rem] rounded-full bg-[#c7f36b]/20 blur-3xl" />
        <div className="absolute -left-40 top-44 size-[28rem] rounded-full bg-[#6d5dfc]/10 blur-3xl" />
      </div>

      <section className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-4 py-2 text-xs font-extrabold text-violet-700 shadow-sm sm:text-sm">
          <Sparkles size={15} />
          V1 pricing hypothesis · subject to beta validation
        </div>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.05em] sm:text-5xl lg:text-6xl">
          Plans built around the <span className="text-violet-700">Dizito operating loop.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Publishing, planning and commerce capabilities scale with your plan. AI-powered generation is coming soon while we prepare the funded service.
        </p>
      </section>

      <section aria-label="Pricing plans" className="mx-auto mt-10 grid max-w-6xl items-stretch gap-5 md:mt-14 md:grid-cols-3 md:gap-6">
        {planRows.map((plan: any) => {
          const normalizedCurrentPlan = currentPlan === "creator" ? "growth" : currentPlan;
          const isCurrent = normalizedCurrentPlan === plan.code;
          const paid = plan.code !== "free";
          const price = Math.round(Number(plan.price_minor) / 100);
          const recommended = plan.code === "growth";

          return (
            <article key={plan.code} className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-[0_12px_34px_rgba(17,24,39,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_46px_rgba(17,24,39,0.10)] sm:p-7 ${recommended ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200"}`}>
              <div className="mb-4 flex h-7 items-center">
                {recommended ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-700 px-3 py-1 text-[11px] font-extrabold text-white">
                    <Sparkles size={12} /> Recommended
                  </span>
                ) : (
                  <span aria-hidden="true" className="invisible rounded-full px-3 py-1 text-[11px]">Recommended</span>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
              </div>

              <div className="mt-6 flex min-h-[68px] items-end gap-2">
                <span className="text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">₹{price.toLocaleString("en-IN")}</span>
                <span className="pb-2 text-sm text-slate-500">{price === 0 ? "forever" : "/ month"}</span>
              </div>
              <div className="mt-2 min-h-6">
                {plan.trial_days > 0 ? (
                  <p className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{plan.trial_days}-day trial hypothesis</p>
                ) : (
                  <p className="text-xs font-medium text-slate-400">No subscription required</p>
                )}
              </div>

              <div className="my-6 border-t border-slate-100" />
              <ul className="flex-1 space-y-4 text-sm">
                {[
                  { label: `${plan.social} social channels`, included: true },
                  { label: `${plan.publishing.toLocaleString("en-IN")} publishing actions / month`, included: true },
                  { label: "AI-powered generation (coming soon)", included: false },
                  { label: "Business Brain", included: true },
                  { label: "Strategy + Generate My Week", included: plan.code !== "free" },
                  { label: "Optimizer", included: plan.code === "pro" },
                  { label: "Commerce", included: plan.code !== "free" },
                ].map((feature) => (
                  <li key={feature.label} className={`flex items-start gap-3 leading-5 ${feature.included ? "text-slate-700" : "text-slate-400"}`}>
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${feature.included ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      {feature.included ? <Check size={12} strokeWidth={3} /> : <Minus size={12} />}
                    </span>
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isCurrent ? (
                  <div className="flex min-h-12 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 px-5 text-sm font-extrabold text-violet-800">Your current plan</div>
                ) : (
                  <PricingButton
                    plan={plan.code as "free" | "growth" | "pro"}
                    href={session ? "/dashboard" : "/login"}
                    label={!session ? "Get started" : paid ? `Choose ${plan.name}` : "Start free"}
                    popular={recommended}
                  />
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mx-auto mt-8 flex max-w-6xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-bold text-slate-900">Looking for a different fit?</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">Agency (₹4,999+ hypothesis) and Founding Beta (₹499 hypothesis) remain controlled catalog entries, not public checkout plans.</p>
        </div>
        <Link href={session ? "/settings/billing" : "/login"} className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50">
          {session ? "Manage billing" : "Sign in to manage billing"}
        </Link>
      </section>
    </main>
  );
}
