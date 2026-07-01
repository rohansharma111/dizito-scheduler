import Link from "next/link";
import { plans } from "@/lib/plans";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let userPlan: string | null = null;

  if (session?.user) {
    const result = await pool.query(
      `
      SELECT plan
      FROM users
      WHERE id = $1
      `,
      [(session.user as any).id],
    );

    userPlan = result.rows[0]?.plan || "free";
  }
  const pricingPlans = [
    {
      key: "free",
      ...plans.free,
      description: "Perfect for getting started",
      button: !session
        ? "Create Free Account"
        : userPlan === "free"
          ? "Current Plan" 
          : "View Dashboard",
      href: session ? "/dashboard" : "/login",
      popular: false,
      disabled: userPlan === "free",
    },

    {
      key: "creator",
      ...plans.creator,
      description: "Best for creators and small businesses",
      button:
        userPlan === "creator" ? "Current Plan" : "Request Creator Access",
      href: userPlan === "creator" ? "/dashboard" : "/contact?plan=creator",
      popular: true,
      disabled: userPlan === "creator",
    },

    {
      key: "agency",
      ...plans.agency,
      description: "Built for agencies and teams",
      button: userPlan === "agency" ? "Current Plan" : "Contact Sales",
      href: userPlan === "agency" ? "/dashboard" : "/contact?plan=agency",
      popular: false,
      disabled: userPlan === "agency",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Early Access Banner */}
      <div className="bg-blue-600 text-white text-center py-3 font-medium">
        🚀 Launch Offer • Founding users get lifetime discounted pricing
      </div>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Schedule Instagram, Facebook & LinkedIn posts from one dashboard.
          </h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create once. Publish everywhere. Built for creators, businesses and
            agencies.
          </p>

          <div className="mt-8 flex justify-center gap-6 text-sm font-medium">
            <span>✓ Instagram</span>
            <span>✓ Facebook</span>
            <span>✓ LinkedIn</span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-white p-8 shadow-sm transition ${
                plan.popular
                  ? "border-blue-600 shadow-xl scale-105"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold">{plan.name}</h2>

              <p className="mt-2 text-gray-500">{plan.description}</p>

              <div className="mt-8">
                <div className="flex items-end">
                  <span className="text-5xl font-bold">₹{plan.price}</span>

                  <span className="ml-2 text-gray-500">
                    {plan.price === 0 ? "Forever" : "/month"}
                  </span>
                </div>

                {plan.price !== 0 && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    Founding member pricing
                  </div>
                )}
              </div>

              <ul className="mt-8 space-y-4">
                <li>✓ {plan.accounts} social accounts</li>

                <li>
                  ✓{" "}
                  {plan.monthlyPosts === Number.MAX_SAFE_INTEGER
                    ? "Unlimited"
                    : plan.monthlyPosts}{" "}
                  scheduled posts
                </li>

                <li>{plan.bulkUpload ? "✓" : "❌"} Bulk CSV upload</li>

                <li>{plan.retrySystem ? "✓" : "❌"} Smart retry system</li>

                <li>{plan.calendar ? "✓" : "❌"} Calendar view</li>

                <li>{plan.drafts ? "✓" : "❌"} Draft posts</li>

                <li>{plan.analytics ? "✓" : "❌"} Analytics</li>

                <li>{plan.prioritySupport ? "✓" : "❌"} Priority support</li>
              </ul>

              {plan.disabled ? (
                <div
                  className="
      mt-10
      block
      w-full
      rounded-lg
      px-6
      py-3
      text-center
      font-medium
      bg-gray-300
      text-gray-700
      cursor-default
    "
                >
                  {plan.button}
                </div>
              ) : (
                <Link
                  href={plan.href}
                  className={`mt-10 block w-full rounded-lg px-6 py-3 text-center font-medium transition ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {plan.button}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Why Dizito */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Why Choose Dizito?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-3">Multi Platform Publishing</h3>

              <p className="text-gray-600">
                Create once and publish to Instagram, Facebook and LinkedIn.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-3">Bulk CSV Upload</h3>

              <p className="text-gray-600">
                Schedule hundreds of posts in seconds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-3">Reliable Publishing</h3>

              <p className="text-gray-600">
                Automatic retries ensure your posts get published.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Compare Plans
          </h2>

          <div className="overflow-x-auto bg-white rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-5 text-left">Feature</th>
                  <th className="p-5">Free</th>
                  <th className="p-5">Creator</th>
                  <th className="p-5">Agency</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b">
                  <td className="p-5">Accounts</td>
                  <td className="text-center">{plans.free.accounts}</td>
                  <td className="text-center">{plans.creator.accounts}</td>
                  <td className="text-center">{plans.agency.accounts}</td>
                </tr>

                <tr className="border-b">
                  <td className="p-5">Monthly Posts</td>
                  <td className="text-center">{plans.free.monthlyPosts}</td>
                  <td className="text-center">{plans.creator.monthlyPosts}</td>
                  <td className="text-center">Unlimited</td>
                </tr>

                <tr className="border-b">
                  <td className="p-5">Bulk Upload</td>
                  <td className="text-center">
                    {plans.free.bulkUpload ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.creator.bulkUpload ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.agency.bulkUpload ? "✅" : "❌"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-5">Retry System</td>
                  <td className="text-center">
                    {plans.free.retrySystem ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.creator.retrySystem ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.agency.retrySystem ? "✅" : "❌"}
                  </td>
                </tr>

                <tr>
                  <td className="p-5">Priority Support</td>
                  <td className="text-center">
                    {plans.free.prioritySupport ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.creator.prioritySupport ? "✅" : "❌"}
                  </td>
                  <td className="text-center">
                    {plans.agency.prioritySupport ? "✅" : "❌"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">Do I need a credit card?</h3>

              <p className="text-gray-600">
                No. You can start using Dizito for free.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">Which platforms are supported?</h3>

              <p className="text-gray-600">Instagram, Facebook and LinkedIn.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">
                Does Dizito support bulk upload?
              </h3>

              <p className="text-gray-600">
                Yes, Creator and Agency plans support CSV bulk uploads.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">Are my social accounts secure?</h3>

              <p className="text-gray-600">
                Yes. Dizito uses official OAuth authentication from Meta and
                LinkedIn. We never store your passwords.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">Does Dizito use official APIs?</h3>

              <p className="text-gray-600">
                Yes. Dizito publishes through the official Meta and LinkedIn
                APIs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-2">Can I upgrade later?</h3>

              <p className="text-gray-600">
                Yes. You can start free and upgrade anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to simplify social media scheduling?
          </h2>

          <p className="text-lg opacity-90 mb-8">
            Create once. Publish everywhere.
          </p>

          <Link
            href="/dashboard"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold"
          >
            {session ? "Go to Dashboard" : "Create Free Account"}
          </Link>
        </div>
      </section>
    </main>
  );
}
