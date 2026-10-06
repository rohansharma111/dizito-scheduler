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
            platforms such as Instagram, Facebook, LinkedIn, Pinterest and Google Business.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Information We Collect
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Name and email address.</li>

            <li>Social account identifiers and profile names.</li>

            <li>OAuth access tokens provided by Meta, LinkedIn, Pinterest and Google Business.</li>

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
            Dizito uses official OAuth authentication provided by Meta, LinkedIn
           , Pinterest and Google Business. Dizito never collects, stores, or has access to your
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
          <h2 className="text-2xl font-semibold mb-2">
            Pinterest API Data and Disconnects
          </h2>

          <p>
            Dizito uses the Pinterest API only after a user explicitly
            authorizes the connection through Pinterest OAuth. We use
            Pinterest-derived account and board information only to identify
            the user&apos;s connected Pinterest Business account, schedule or
            publish content requested by the user, and maintain connection
            status and publishing history.
          </p>

          <p>
            Dizito is an independent service and is not endorsed by,
            sponsored by, or affiliated with Pinterest.
          </p>

          <p>
            When a user disconnects a Pinterest account from Dizito, we remove
            the stored Pinterest access credentials and Pinterest account and
            board identifiers associated with that connection, and remove the
            associated pending OAuth session data. We do not retain Pinterest
            passwords. Content that the user created in Dizito may remain as
            part of the user&apos;s Dizito content history unless the user also
            requests deletion of that Dizito content or account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Data Deletion</h2>

          <p>
            Users may disconnect connected social accounts at any time from
            Dizito. Users may also request deletion of their Dizito account
            and associated personal data by contacting us. We process
            Pinterest-related data in accordance with the disconnect and
            deletion process described above.
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
