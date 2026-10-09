import { DizitoPage, DizitoPageHeader, DizitoCard } from "@/components/dizito/DizitoUI";

export default function TermsPage() {
  return (
    <DizitoPage className="max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <DizitoPageHeader eyebrow="Dizito policies" title="Terms of service" description="Information about how Dizito operates and the terms that apply to using the service." />

      <DizitoCard className="space-y-8 text-sm leading-7 text-slate-600 sm:text-base">
        <p>Last Updated: July 2026</p>

        <section>
          <h2 className="mb-2 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Acceptance of Terms</h2>

          <p>
            By accessing or using Dizito, you agree to be bound by these Terms
            of Service. If you do not agree to these terms, you may not use the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Description of Service
          </h2>

          <p>
            Dizito is a social media scheduling and publishing platform that
            enables users to connect supported social media accounts and
            schedule content for publication.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">User Accounts</h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              Users are responsible for maintaining the security of their
              account.
            </li>

            <li>Users must provide accurate information.</li>

            <li>
              Users are responsible for all activity performed through their
              account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Content Responsibility
          </h2>

          <p>
            Users retain full ownership and responsibility for all content
            published through Dizito.
          </p>

          <p>
            Users agree not to publish content that violates applicable laws or
            the policies of social media platforms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Third-Party Platforms</h2>

          <p>
            Dizito integrates with third-party services including Meta (Facebook
            and Instagram), LinkedIn, Pinterest and Google Business. Use of these integrations is subject to
            the respective platform terms and policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Service Availability</h2>

          <p>
            Dizito strives to provide reliable service but does not guarantee
            uninterrupted availability, error-free operation, or successful
            publication on third-party platforms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Suspension and Termination
          </h2>

          <p>
            Dizito reserves the right to suspend or terminate accounts that
            violate these terms, abuse the service, or violate third-party
            platform policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Limitation of Liability
          </h2>

          <p>
            Dizito shall not be liable for any direct, indirect, incidental, or
            consequential damages resulting from the use of the service or
            failure of third-party integrations.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Changes to Terms</h2>

          <p>
            Dizito may modify these terms at any time. Continued use of the
            service constitutes acceptance of updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact</h2>

          <p>For questions regarding these Terms of Service, please contact:</p>

          <p className="font-medium">support@dizito.in</p>
        </section>
      </DizitoCard>
    </DizitoPage>
  );
}
