export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto py-20 px-6">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="space-y-6 text-gray-700 leading-7">
        <p>Last Updated: July 2026</p>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Introduction</h2>

          <p>
            Dizito is a social media scheduling platform that allows users to
            connect and manage their social media accounts across supported
            platforms such as Instagram, Facebook, and LinkedIn.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Information We Collect
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Name and email address.</li>

            <li>Social account identifiers and profile names.</li>

            <li>OAuth access tokens provided by Meta and LinkedIn.</li>

            <li>Content and media uploaded for scheduling.</li>

            <li>Scheduling preferences and publishing history.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            How We Use Your Information
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>To authenticate your account.</li>

            <li>To connect your social media profiles.</li>

            <li>To schedule and publish posts on your behalf.</li>

            <li>To provide analytics and activity history.</li>

            <li>To improve the Dizito platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Social Media Authentication
          </h2>

          <p>
            Dizito uses official OAuth authentication provided by Meta and
            LinkedIn. Dizito never collects, stores, or has access to your
            social media passwords.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Access Tokens</h2>

          <p>
            Access tokens are stored securely and used solely for authorized
            publishing, account management, and analytics purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Data Sharing</h2>

          <p>
            Dizito does not sell, rent, or share personal information with third
            parties except as required to provide the services requested by
            users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Data Deletion</h2>

          <p>
            Users may disconnect their social accounts or request deletion of
            their account and associated data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Security</h2>

          <p>
            We implement reasonable security measures to protect user data and
            access credentials.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact</h2>

          <p>
            For privacy-related questions or data deletion requests, contact:
          </p>

          <a className="font-medium" href="mailto:contact@dizito.in">contact@dizito.in</a>
        </section>
      </div>
    </main>
  );
}
