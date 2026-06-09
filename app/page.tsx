import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="text-center py-24">
        <h1 className="text-5xl font-bold">
          Schedule Instagram Posts Automatically
        </h1>

        <p className="mt-6 text-xl">
          Upload, schedule and publish Instagram posts automatically.
        </p>

        <Link
          href="/dashboard"
          className="inline-block mt-8 bg-blue-600 text-white px-8 py-4 rounded"
        >
          Start Scheduling
        </Link>
      </section>
      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto">
          <div className="border p-6 rounded">
            <h3 className="font-bold">Schedule Posts</h3>

            <p>Schedule Instagram posts in advance.</p>
          </div>

          <div className="border p-6 rounded">
            <h3 className="font-bold">Multi Account Support</h3>

            <p>Manage multiple Instagram accounts.</p>
          </div>

          <div className="border p-6 rounded">
            <h3 className="font-bold">Auto Publishing</h3>

            <p>Posts are published automatically.</p>
          </div>
        </div>
      </section>
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold">Pricing</h2>

        <div className="mt-10 border p-8 rounded max-w-md mx-auto">
          <h3 className="text-2xl font-bold">Free Beta</h3>

          <p className="mt-4">Early users get free access.</p>
        </div>
      </section>
      <section className="py-20 text-center">
        <h2 className="text-4xl font-bold">
          Ready to automate Instagram posting?
        </h2>

        <Link
          href="/dashboard"
          className="inline-block mt-8 bg-blue-600 text-white px-8 py-4 rounded"
        >
          Start Scheduling
        </Link>
      </section>
    </div>
  );
}
