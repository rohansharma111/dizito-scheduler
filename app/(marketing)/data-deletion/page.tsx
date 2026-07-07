export default function DataDeletionPage() {
  return (
    <main className="max-w-4xl mx-auto py-20 px-6">
      <h1 className="text-4xl font-bold mb-8">Data Deletion Instructions</h1>

      <div className="space-y-8 text-gray-700 leading-7">
        <p>Last Updated: July 2026</p>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Account and Data Deletion
          </h2>

          <p>
            Dizito users have the right to request deletion of their account and
            associated data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            What Data Will Be Deleted
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>User account information</li>

            <li>
              Connected Facebook, Instagram, LinkedIn and Pinterest account information
            </li>

            <li>OAuth access tokens and refresh tokens</li>

            <li>Scheduled, published, and draft posts</li>

            <li>Activity history and analytics data</li>

            <li>Uploaded media and related metadata</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            How to Request Deletion
          </h2>

          <p>
            To request deletion of your Dizito account and all associated data,
            please send an email to:
          </p>

          <div className="bg-gray-100 rounded-lg p-4 my-4">
            <p className="font-semibold">support@dizito.in</p>
          </div>

          <p>Please include:</p>

          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Your registered email address</li>

            <li>Your Dizito account name (if available)</li>

            <li>
              Subject line:
              <strong> "Data Deletion Request"</strong>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Processing Time</h2>

          <p>
            After verification of account ownership, Dizito will process
            deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Social Platform Access
          </h2>

          <p>
            Users may also revoke Dizito's access directly from their connected
            social media accounts:
          </p>

          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Facebook/Instagram: Settings → Business Integrations</li>

            <li>LinkedIn: Settings → Data Privacy → Authorized Applications</li>
            <li>Pinterest: Settings → Privacy → Apps and Websites</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact</h2>

          <p>
            For any questions regarding account deletion or privacy requests,
            contact:
          </p>

          <p className="font-semibold">support@dizito.in</p>
        </section>
      </div>
    </main>
  );
}
