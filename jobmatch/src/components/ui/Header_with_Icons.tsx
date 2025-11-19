'use client';

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isCompany = pathname?.startsWith("/dashboard/company");
  const applicationHref = isCompany ? "/dashboard/company/application" : "/dashboard/application";
  const jobListingsHref = "/dashboard";

  return (
    <header className="bg-[--brand] text-[--brand]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo on the left, centered vertically */}
        <Link href="/" className="flex items-center">
          <Image
            src="/COLAB_logo_reverse.png"
            alt="COLAB connects logo"
            width={180}
            height={40}
            priority
            style={{ width: "180px", height: "auto" }}
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={applicationHref}
            className="inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-8 w-8"
            >
              <path d="M9 4h6" />
              <path d="M9 6h6M9 8h6" />
              <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
              <path d="M9 12h6M9 16h6" />
            </svg>
            <span className="text-xs font-semibold">Event Application</span>
          </Link>
          {!isCompany ? (
            <Link
              href={jobListingsHref}
              className="inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-8 w-8"
              >
                <path d="M10 7V5.5a2.5 2.5 0 0 1 5 0V7" />
                <path d="M5 9.5A2.5 2.5 0 0 1 7.5 7h9A2.5 2.5 0 0 1 19 9.5v7A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5Z" />
                <path d="M5 12h14" />
              </svg>
              <span className="text-xs font-semibold">Job Listings</span>
            </Link>
          ) : null}
          {!isCompany ? (
            <Link
              href="/dashboard/profile"
              className="inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-8 w-8"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
              </svg>
              <span className="text-xs font-semibold">Profile</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
