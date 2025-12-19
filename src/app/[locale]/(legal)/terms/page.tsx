import { Link } from "~/i18n/navigation";

export default function TermsPage() {
  return (
    <div className="bg-primary text-primary-text min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-accent mb-4 text-4xl font-bold">
            Terms of Service
          </h1>
          <p className="text-secondary-text text-lg">Last updated: [Date]</p>
        </div>

        <div className="bg-secondary/50 border-secondary-text/10 space-y-8 rounded-lg border p-8 backdrop-blur-sm">
          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              1. Acceptance of Terms
            </h2>
            <p className="text-secondary-text leading-relaxed">
              By accessing and using PrepPal (&quot;the Service&quot;), you
              accept and agree to be bound by the terms and provision of this
              agreement. This is a placeholder for the actual terms of service
              content.
            </p>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              2. Use License
            </h2>
            <p className="text-secondary-text mb-4 leading-relaxed">
              Permission is granted to temporarily use PrepPal for personal,
              non-commercial transitory viewing only. This is the grant of a
              license, not a transfer of title, and under this license you may
              not:
            </p>
            <ul className="text-secondary-text ml-6 space-y-2">
              <li>• modify or copy the materials</li>
              <li>
                • use the materials for any commercial purpose or for any public
                display
              </li>
              <li>
                • attempt to reverse engineer any software contained on the
                website
              </li>
              <li>
                • remove any copyright or other proprietary notations from the
                materials
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              3. Interview Data and Privacy
            </h2>
            <p className="text-secondary-text leading-relaxed">
              Your interview sessions may be recorded and analyzed to provide
              feedback. All data is handled in accordance with our Privacy
              Policy. We are committed to protecting your personal information
              and interview data.
            </p>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              4. User Account
            </h2>
            <p className="text-secondary-text leading-relaxed">
              You are responsible for safeguarding the password and for all
              activities that occur under your account. You agree not to
              disclose your password to any third party and to take sole
              responsibility for activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              5. Prohibited Uses
            </h2>
            <p className="text-secondary-text mb-4 leading-relaxed">
              You may not use our service:
            </p>
            <ul className="text-secondary-text ml-6 space-y-2">
              <li>
                • for any unlawful purpose or to solicit others to unlawful acts
              </li>
              <li>
                • to violate any international, federal, provincial, or state
                regulations, rules, laws, or local ordinances
              </li>
              <li>• to impersonate or attempt to impersonate another person</li>
              <li>
                • to harass, abuse, insult, harm, defame, slander, disparage,
                intimidate, or discriminate
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              6. Disclaimer
            </h2>
            <p className="text-secondary-text leading-relaxed">
              The information on this website is provided on an &apos;as
              is&apos; basis. To the fullest extent permitted by law, this
              Company excludes all representations, warranties, conditions and
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-primary-text mb-4 text-2xl font-semibold">
              7. Contact Information
            </h2>
            <p className="text-secondary-text leading-relaxed">
              If you have any questions about these Terms of Service, please
              contact us at [contact information].
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="bg-accent hover:bg-accent/80 text-primary inline-block rounded-md px-6 py-3 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
