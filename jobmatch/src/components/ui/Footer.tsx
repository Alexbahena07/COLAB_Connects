// src/components/ui/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-white bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:justify-between">
        {/* Left: Logo + blurb */}
        <div className="space-y-4 md:max-w-sm">
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-32">
              <Image
                src="/COLAB_logo_reverse.png"
                alt="COLAB Connects logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <p className="text-sm opacity-80">
            Connecting next-generation talent with firms across private equity,
            venture capital, real assets, and more.
          </p>

          <p className="text-xs uppercase tracking-wide opacity-60">
            © {year} COLAB Connects. All rights reserved.
          </p>
        </div>

        {/* Middle: Contact + social */}
        <div className="space-y-4 text-sm">
          <h3 className="text-base font-semibold text-foreground">Contact us</h3>
          <p className="opacity-80">
            Questions about the Career Forum or partnerships? Reach out anytime.
          </p>

          <a
            href="mailto:coordinator@colabconnects.org"
            className="font-semibold text-foreground underline"
          >
            coordinator@colabconnects.org
          </a>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Follow us</h4>
            <div className="flex items-center gap-3 text-sm">
              <a
                href="https://www.linkedin.com/company/colab-connects-org/?viewAsMember=true"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brandBlue px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                {/* svg ... */}
                <span>LinkedIn</span>
              </a>

              <a
                href="https://www.instagram.com/colabconnectsorg/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brandBlue px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                {/* svg ... */}
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Newsletter + nav links */}
        <div className="space-y-5 md:min-w-[260px]">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Subscribe to our newsletter
            </h3>
            <p className="mt-1 text-xs opacity-80">
              Get updates on events, applications, and new opportunities.
            </p>

            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <input
                type="email"
                required
                placeholder="Email address"
                className="h-10 flex-1 rounded-xl border border-foreground bg-[color-mix(in_oklab,var(--background),transparent_95%)] px-3 text-sm outline-none focus:border-brand"
              />
              <button type="submit" className="btn-brand h-10 px-4 text-sm">
                Subscribe
              </button>
            </form>

            <label className="mt-2 flex items-center gap-2 text-[10px] text-[color-mix(in_oklab,var(--foreground),transparent_30%)]">
              <input type="checkbox" defaultChecked className="h-3 w-3" />
              <span>Yes, email me about COLAB news and events.</span>
            </label>
          </div>

          <nav>
            <ul className="flex flex-wrap gap-3 text-[11px] text-foreground/70">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/about" className="hover:underline">About Us</Link></li>
              <li><Link href="/events" className="hover:underline">Events</Link></li>
              <li><Link href="/careerforum" className="hover:underline">Career Forum</Link></li>
              <li><Link href="/partners" className="hover:underline">Partners</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact Us</Link></li>
              <li><Link href="/privacy" className="underline underline-offset-2 hover:opacity-90">Privacy Policy</Link></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
