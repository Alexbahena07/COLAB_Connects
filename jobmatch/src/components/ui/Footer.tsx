// src/components/ui/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[--border] bg-[--surface] text-[--foreground]">
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
          <h3 className="text-base font-semibold text-[--brand]">Contact us</h3>
          <p className="opacity-80">
            Questions about the Career Forum or partnerships? Reach out anytime.
          </p>
          <a
            href="mailto:coordinator@colabconnects.org"
            className="font-semibold text-[--brandBlue] hover:underline"
          >
            coordinator@colabconnects.org
          </a>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-[--foreground]">Follow us</h4>
            <div className="flex items-center gap-3 text-sm">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/colab-connects-org/?viewAsMember=true"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[--brandBlue] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18H5.67V9.75h2.67Zm-1.34-9.39a1.45 1.45 0 1 1 1.44-1.45A1.44 1.44 0 0 1 7 8.61Zm11 9.39h-2.67v-4.1c0-1 0-2.25-1.37-2.25s-1.58 1.06-1.58 2.18V18H9.71V9.75h2.56v1.13h.04a2.8 2.8 0 0 1 2.52-1.38C17.6 9.5 18 11 18 13Z" />
                </svg>
                <span>LinkedIn</span>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/colabconnectsorg/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[--brandBlue] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.71 4.71 0 0 0 12 7.3Zm0 7.75A3.05 3.05 0 1 1 15 12 3.06 3.06 0 0 1 12 15.05Zm4.92-7.93a1.1 1.1 0 1 0-1.1-1.1 1.1 1.1 0 0 0 1.1 1.1Zm2.85-1.12a5.27 5.27 0 0 0-1.47-3.74A5.3 5.3 0 0 0 14.54 1.8c-1.4-.08-5.69-.08-7.08 0A5.3 5.3 0 0 0 3.7 3.26 5.27 5.27 0 0 0 2.25 7c-.08 1.4-.08 5.69 0 7.08a5.27 5.27 0 0 0 1.47 3.74 5.3 5.3 0 0 0 3.76 1.47c1.4.08 5.69.08 7.08 0a5.27 5.27 0 0 0 3.74-1.47 5.3 5.3 0 0 0 1.47-3.76c.08-1.4.08-5.69 0-7.08Zm-2 8.61a3.05 3.05 0 0 1-1.72 1.72c-1.19.47-4 .36-5.05.36s-3.87.11-5.05-.36a3.05 3.05 0 0 1-1.72-1.72c-.47-1.19-.36-4-.36-5.05s-.11-3.87.36-5.05A3.05 3.05 0 0 1 6 4.94c1.19-.47 4-.36 5.05-.36s3.87-.11 5.05.36a3.05 3.05 0 0 1 1.72 1.72c.47 1.19.36 4 .36 5.05s.11 3.87-.36 5.05Z" />
                </svg>
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Newsletter + nav links */}
        <div className="space-y-5 md:min-w-[260px]">
          <div>
            <h3 className="text-base font-semibold text-[--brand]">
              Subscribe to our newsletter
            </h3>
            <p className="mt-1 text-xs opacity-80">
              Get updates on events, applications, and new opportunities.
            </p>

            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                // hook newsletter API here
              }}
            >
              <input
                type="email"
                required
                placeholder="Email address"
                className="h-10 flex-1 rounded-xl border border-[--border] bg-[--background]/5 px-3 text-sm outline-none focus:border-[--brand]"
              />
              <button
                type="submit"
                className="btn-brand h-10 px-4 text-sm"
              >
                Subscribe
              </button>
            </form>

            <label className="mt-2 flex items-center gap-2 text-[10px] text-[--foreground]/70">
              <input type="checkbox" defaultChecked className="h-3 w-3" />
              <span>Yes, email me about COLAB news and events.</span>
            </label>
          </div>

          <nav className="pt-3 text-sm">
            <ul className="flex flex-wrap gap-3 opacity-80">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:underline">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/careerforum" className="hover:underline">
                  Career Forum
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:underline">
                  Partners
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:underline">
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
