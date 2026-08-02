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
            <p className="text-sm text-[var(--foreground)]/70">Last updated: 7/31/2026</p>
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
                <li>Resume and profile photo</li>
                <li>Employer or company profile information (for employer accounts)</li>
                <li>
                  Billing information when a company purchases a sponsorship. Full payment
                  card details are entered directly with our payment processor, Stripe, and
                  are not stored on our servers.
                </li>
                <li>Messages you send or receive through the platform&apos;s messaging feature</li>
              </ul>
              <p>We also collect limited information automatically:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  IP address and request activity, used to secure accounts and prevent abuse
                  (for example, limiting repeated login or password-reset attempts)
                </li>
                <li>Basic usage data (such as pages visited) collected through Vercel Analytics</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Create and maintain your COLAB Connects profile</li>
                <li>Match users with relevant career opportunities</li>
                <li>Enable employers to discover early-career talent</li>
                <li>Deliver messages sent between companies and candidates</li>
                <li>Process sponsorship payments and manage sponsor benefits</li>
                <li>Communicate important account or platform updates</li>
                <li>Improve platform functionality and user experience</li>
                <li>Secure the platform and prevent fraud or abuse</li>
              </ul>
              <p>We do not sell personal data or use it for third-party advertising.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">
                Third-Party Service Providers
              </h2>
              <p>
                We share limited information with a small number of service providers who
                help us operate COLAB Connects. Each is only given the information it needs
                to perform its function, and none are permitted to use your data for their
                own purposes.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-semibold">Stripe</span> — processes sponsorship
                  payments on our behalf. We do not store your full card details.
                </li>
                <li>
                  <span className="font-semibold">Our messaging service provider</span> —
                  delivers messages sent through the platform. When a company messages a
                  candidate, that candidate&apos;s name, email address, and the message
                  content are shared with this provider to deliver it.
                </li>
                <li>
                  <span className="font-semibold">Resend</span> — sends account-related
                  emails, such as password resets, email verification, and notification
                  digests.
                </li>
                <li>
                  <span className="font-semibold">Vercel</span> — hosts the platform, stores
                  uploaded profile photos and resumes, and provides basic usage analytics.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Cookies</h2>
              <p>
                We use a session cookie to keep you signed in to your account. We do not use
                third-party advertising or tracking cookies.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Data Retention</h2>
              <p>
                We retain personal data only for as long as your account is active or as needed
                to provide services. You may request deletion of your account at any time by
                contacting us at the email address below; we will remove your personal data
                from our systems unless retention is required by law.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--brand)]">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access your personal data</li>
                <li>Correct or update your information</li>
                <li>Request deletion of your account and associated data</li>
                <li>
                  Opt out of non-essential email notifications at any time from your
                  notification settings
                </li>
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
