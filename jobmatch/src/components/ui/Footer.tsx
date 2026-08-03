// src/components/ui/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-12 overflow-hidden bg-brand text-white">
      {/* Ambient accent, echoes the hero's blur treatment */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
          {/* Brand */}
          <div className="space-y-4">
            <div className="relative h-10 w-32">
              <Image
                src="/COLAB_logo_reverse.png"
                alt="COLAB Connects logo"
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            <p className="max-w-sm text-sm text-white/80">
              Connecting next-generation talent with firms across private equity,
              venture capital, real assets, and more.
            </p>
          </div>

          {/* Contact + social */}
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Contact us
              </h3>
              <p className="text-sm text-white/80">
                Questions about the Career Forum or partnerships? Reach out anytime.
              </p>
              <a
                href="mailto:coordinator@colabconnects.org"
                className="inline-block text-sm font-semibold text-white underline underline-offset-2 hover:opacity-90"
              >
                coordinator@colabconnects.org
              </a>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Follow us
              </h4>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://www.linkedin.com/company/colab-connects-org/?viewAsMember=true"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="COLAB Connects on LinkedIn"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8" cy="8.3" r="0.6" fill="currentColor" stroke="none" />
                    <path d="M8 11v6" />
                    <path d="M12 17v-3.5a2.5 2.5 0 0 1 5 0V17" />
                    <path d="M12 13v-2" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/colabconnectsorg/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="COLAB Connects on Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Legal bar */}
        <div className="mt-10 flex flex-col-reverse items-center gap-4 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:justify-between">
          <p className="tracking-wide">© {year} COLAB Connects. All rights reserved.</p>
          <Link href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
