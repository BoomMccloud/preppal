import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-primary text-primary-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-accent mb-4">Privacy Policy</h1>
          <p className="text-secondary-text text-lg">Last updated: [Date]</p>
        </div>

        <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-8 space-y-8 border border-secondary-text/10">
          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">1. Information We Collect</h2>
            <p className="text-secondary-text leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account,
              participate in interviews, or contact us for support.
            </p>
            <ul className="text-secondary-text space-y-2 ml-6">
              <li>• Account information (name, email address)</li>
              <li>• Interview recordings and transcripts</li>
              <li>• Performance data and feedback</li>
              <li>• Technical information (IP address, browser type)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">2. How We Use Your Information</h2>
            <p className="text-secondary-text leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-secondary-text space-y-2 ml-6">
              <li>• Provide and improve our interview preparation services</li>
              <li>• Generate personalized feedback and recommendations</li>
              <li>• Communicate with you about your account and our services</li>
              <li>• Analyze usage patterns to enhance user experience</li>
              <li>• Ensure the security and integrity of our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">3. Interview Data and Recordings</h2>
            <p className="text-secondary-text leading-relaxed">
              Your interview sessions are recorded and analyzed using AI technology to provide feedback.
              These recordings are securely stored and used solely for the purpose of generating your
              personalized feedback report. We do not share your interview recordings with third parties
              without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">4. Data Security</h2>
            <p className="text-secondary-text leading-relaxed">
              We implement appropriate security measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. This includes encryption of
              sensitive data both in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">5. Data Retention</h2>
            <p className="text-secondary-text leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to
              provide you services. Interview recordings are typically retained for 90 days unless you
              request earlier deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">6. Your Rights</h2>
            <p className="text-secondary-text leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="text-secondary-text space-y-2 ml-6">
              <li>• Access your personal information</li>
              <li>• Correct inaccurate data</li>
              <li>• Delete your account and associated data</li>
              <li>• Export your data</li>
              <li>• Opt out of certain communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">7. Third-Party Services</h2>
            <p className="text-secondary-text leading-relaxed">
              Our service may contain links to third-party websites or integrate with third-party services.
              We are not responsible for the privacy practices of these third parties. We encourage you
              to read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">8. Changes to This Policy</h2>
            <p className="text-secondary-text leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary-text mb-4">9. Contact Us</h2>
            <p className="text-secondary-text leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at [contact information].
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-accent hover:bg-accent/80 text-primary px-6 py-3 rounded-md transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}