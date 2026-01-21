import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--foreground)]">
      <Header />
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="space-y-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]/70">
              COLAB Connects
            </p>
            <h1 className="text-3xl font-bold text-[var(--brand)] md:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-sm text-[var(--foreground)]/70">Last updated: [1/20/2026]</p>
          </div>

          <div className="space-y-6 text-sm leading-6 text-[var(--foreground)]/90">
            <p>
              COLAB Connects ("COLAB Connects," "we," "our," or "us") respects your privacy
              and is committed to protecting your personal information. This Privacy Policy
              explains how we collect, use, store, and share information when you use our
              website and services.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Information We Collect</h2>
              <p>We collect information you choose to provide, including:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Name, email address, and account credentials</li>
                <li>Education history, work experience, skills, and career preferences</li>
                <li>Resume and profile information</li>
                <li>Employer or company profile information (for employer accounts)</li>
              </ul>
              <p>
                If you choose to import data from third-party services (such as LinkedIn via
                approved APIs), only the information you explicitly authorize will be
                imported.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Create and maintain your COLAB Connects profile</li>
                <li>Match users with relevant career opportunities</li>
                <li>Enable employers to discover early-career talent</li>
                <li>Communicate important account or platform updates</li>
                <li>Improve platform functionality and user experience</li>
              </ul>
              <p>We do not sell personal data or use it for third-party advertising.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">
                Third-Party Data &amp; Data Portability
              </h2>
              <p>If you choose to import data from third-party platforms:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>The import is user-initiated</li>
                <li>Imported data is used only to populate your profile</li>
                <li>You may edit or remove imported data at any time</li>
                <li>We do not store or use third-party data beyond its intended purpose</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Data Retention</h2>
              <p>
                We retain personal data only for as long as your account is active or as needed
                to provide services. You may delete your account at any time, which will remove
                your personal data from our systems unless retention is required by law.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access your personal data</li>
                <li>Correct or update your information</li>
                <li>Request deletion of your account and associated data</li>
                <li>Withdraw consent for optional data sharing</li>
              </ul>
              <p>Requests can be made by contacting us at the email address below.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Data Security</h2>
              <p>
                We implement reasonable technical and organizational measures to protect your
                information from unauthorized access, loss, or misuse.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Contact Us</h2>
              <p>If you have questions or requests regarding privacy or data usage, contact us at:</p>
              <p className="font-semibold">Email: coordinator@colabconnects.org</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
