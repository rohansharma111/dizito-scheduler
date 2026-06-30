import Link from "next/link";

export default function HomePage() {
  const features = [
    "Instagram Publishing",
    "Facebook Publishing",
    "LinkedIn Publishing",
    "Bulk CSV Upload",
    "Multi Account Support",
    "Calendar Scheduling",
    "Smart Retry System",
    "Draft Management",
  ];

  const steps = [
    {
      title: "Connect Accounts",
      description:
        "Connect your Instagram, Facebook and LinkedIn accounts securely.",
    },
    {
      title: "Create Content",
      description: "Create one post and select multiple social accounts.",
    },
    {
      title: "Schedule & Publish",
      description: "Schedule once and let Dizito publish automatically.",
    },
  ];

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
            🚀 Multi Platform Social Media Scheduler
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Schedule Instagram,
            <br />
            Facebook & LinkedIn
            <br />
            from one dashboard.
          </h1>

          <p className="text-xl text-gray-600 mt-8 max-w-3xl mx-auto">
            Create once. Publish everywhere. Manage all your social media
            accounts, schedule posts, bulk upload content and automate
            publishing from a single place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700"
            >
              Start Free
            </Link>

            <Link
              href="/pricing"
              className="border border-gray-300 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50"
            >
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-gray-500">
            <div>✓ No credit card required</div>
            <div>✓ Multi-platform publishing</div>
            <div>✓ Bulk scheduling</div>
          </div>
        </div>
      </section>

      {/* PLATFORM SUPPORT */}
      <section className="border-y bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-center text-gray-500 mb-8">Supported Platforms</p>

          <div className="flex flex-wrap justify-center gap-6">
            <div className="bg-white px-6 py-4 rounded-lg border">
              Instagram
            </div>

            <div className="bg-white px-6 py-4 rounded-lg border">Facebook</div>

            <div className="bg-white px-6 py-4 rounded-lg border">LinkedIn</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">
            Everything you need to manage social media
          </h2>

          <p className="text-gray-600 mt-4">
            Powerful scheduling and publishing tools built for creators,
            businesses and agencies.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature} className="border rounded-xl p-6">
              <div className="text-green-600 text-xl mb-3">✓</div>

              <h3 className="font-semibold">{feature}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">How Dizito Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="bg-white rounded-xl border p-8">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-6">
                  {index + 1}
                </div>

                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>

                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">Built For Everyone</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="border rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4">Creators</h3>

            <p className="text-gray-600">
              Schedule content across multiple platforms from one dashboard.
            </p>
          </div>

          <div className="border rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4">Businesses</h3>

            <p className="text-gray-600">
              Manage your brand presence with reliable scheduling and
              publishing.
            </p>
          </div>

          <div className="border rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4">Agencies</h3>

            <p className="text-gray-600">
              Manage multiple clients with bulk upload and multi-account
              support.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-24">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-white">
            Start scheduling smarter today.
          </h2>

          <p className="text-blue-100 mt-4 text-lg">
            Join creators, businesses and agencies using Dizito to automate
            social media publishing.
          </p>

          <div className="mt-10">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
