import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { plans } from "@/lib/plans";

export default async function Home() {
  const session = await getServerSession(authOptions);

  let userPlan = "free";

  if (session?.user) {
    const result = await pool.query(
      `
        SELECT plan
        FROM users
        WHERE id = $1
        `,
      [(session.user as any).id],
    );

    userPlan = result.rows[0]?.plan ?? "free";
  }

  const ctaHref = session ? "/dashboard" : "/login";

  const ctaText = !session
    ? "Create Free Account"
    : `Continue with ${
        userPlan.charAt(0).toUpperCase() + userPlan.slice(1)
      } Plan`;

  const homepagePlans = [
    {
      key: "free",
      ...plans.free,
      description: "Perfect for getting started",
    },

    {
      key: "creator",
      ...plans.creator,
      description: "Best for creators and businesses",
    },

    {
      key: "agency",
      ...plans.agency,
      description: "Built for agencies and teams",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer">Dizito</h1>
          </Link>

          <nav className="flex items-center gap-6">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            🚀 Launch Offer • Founding users get lifetime discounted pricing
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Schedule Instagram,
            <br />
            Facebook & LinkedIn posts
            <br />
            from one dashboard.
          </h1>

          <p className="mt-8 text-xl text-gray-600 max-w-3xl mx-auto">
            Create once. Publish everywhere.
            <br />
            Built for creators, businesses and agencies.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Link
              href={ctaHref}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700"
            >
              {ctaText}
            </Link>

            <Link
              href="/pricing"
              className="border px-8 py-4 rounded-lg font-semibold hover:bg-gray-50"
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-10 flex justify-center gap-8 text-sm font-medium">
            <span>✓ Instagram</span>

            <span>✓ Facebook</span>

            <span>✓ LinkedIn</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything you need to automate social publishing
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">
                Multi Platform Publishing
              </h3>

              <p className="text-gray-600">
                Create once and publish to Instagram, Facebook and LinkedIn.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Bulk CSV Upload</h3>

              <p className="text-gray-600">
                Schedule hundreds of posts in seconds.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Reliable Publishing</h3>

              <p className="text-gray-600">
                Automatic retries ensure your posts get published.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Calendar Scheduling</h3>

              <p className="text-gray-600">
                Visualize all scheduled posts in one place.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Draft Posts</h3>

              <p className="text-gray-600">Save ideas and publish later.</p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Multi Account Support</h3>

              <p className="text-gray-600">
                Manage multiple accounts from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Pricing</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {homepagePlans.map((plan) => (
              <div
                key={plan.key}
                className={`bg-white rounded-xl p-8 text-center border ${
                  plan.key === "creator" ? "border-blue-600 border-2" : ""
                }`}
              >
                <h3 className="text-2xl font-bold">{plan.name}</h3>

                <div className="text-5xl font-bold mt-4">₹{plan.price}</div>

                <div className="text-gray-500 mt-2">
                  {plan.price === 0 ? "Forever" : "/month"}
                </div>

                <p className="mt-4 text-gray-600">{plan.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold"
            >
              View Full Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-10">Built on Official APIs</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Secure Authentication</h3>

              <p className="text-gray-600">
                Dizito uses official OAuth authentication from Meta and
                LinkedIn.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-8">
              <h3 className="font-bold text-xl mb-4">Reliable Publishing</h3>

              <p className="text-gray-600">
                Posts are published through official Meta and LinkedIn APIs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to simplify social media scheduling?
          </h2>

          <p className="text-xl opacity-90 mb-10">
            Create once. Publish everywhere.
          </p>

          <Link
            href={ctaHref}
            className="inline-block bg-white text-blue-600 px-10 py-5 rounded-lg font-semibold"
          >
            {ctaText}
          </Link>
        </div>
      </section>
    </main>
  );
}
