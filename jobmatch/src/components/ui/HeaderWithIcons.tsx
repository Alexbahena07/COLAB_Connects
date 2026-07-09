'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/ui/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const CareerForumIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M9 4h6" />
    <path d="M9 6h6M9 8h6" />
    <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

const OpportunitiesIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M10 7V5.5a2.5 2.5 0 0 1 5 0V7" />
    <path d="M5 9.5A2.5 2.5 0 0 1 7.5 7h9A2.5 2.5 0 0 1 19 9.5v7A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5Z" />
    <path d="M5 12h14" />
  </svg>
);

const ProfileIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);

const ApplicantsIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M4 11.5 11.5 4 19 11.5" />
    <path d="M6.5 10v7.5A2.5 2.5 0 0 0 9 20h6a2.5 2.5 0 0 0 2.5-2.5V10" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const CandidatesIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ManageJobsIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <rect x="4" y="7" width="16" height="11" rx="2" />
    <path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7" />
    <path d="M8 11h8" />
    <path d="M8 14h4" />
  </svg>
);

export default function Header() {
  const pathname = usePathname();
  const isCompany = pathname?.startsWith("/dashboard/company");
  const applicationHref = isCompany ? "/dashboard/company/application" : "/dashboard/application";
  const jobListingsHref = "/dashboard";
  const logoHref = "/dashboard/company";
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: NavItem[] = isCompany
    ? [
        { href: applicationHref, label: "Career Forum", icon: CareerForumIcon },
        { href: "/dashboard/company", label: "Applicants", icon: ApplicantsIcon },
        { href: "/dashboard/company/candidates", label: "Candidates", icon: CandidatesIcon },
        { href: "/dashboard/company/jobs", label: "Manage Jobs", icon: ManageJobsIcon },
        { href: "/dashboard/company/profile", label: "Profile", icon: ProfileIcon },
      ]
    : [
        { href: applicationHref, label: "Career Forum", icon: CareerForumIcon },
        { href: jobListingsHref, label: "Opportunities", icon: OpportunitiesIcon },
        { href: "/dashboard/profile", label: "Profile", icon: ProfileIcon },
      ];

  return (
    <header className="sticky top-0 z-50 bg-brand text-brand">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Logo on the left, centered vertically */}
        {isCompany ? (
          <Link href={logoHref} className="flex shrink-0 items-center">
            <Image
              src="/COLAB_logo_reverse.png"
              alt="COLAB connects logo"
              width={180}
              height={65}
              priority
              style={{ width: "140px", height: "auto" }}
              className="sm:w-45!"
            />
          </Link>
        ) : (
          <div className="flex shrink-0 items-center">
            <Image
              src="/COLAB_logo_reverse.png"
              alt="COLAB connects logo"
              width={180}
              height={65}
              priority
              style={{ width: "140px", height: "auto" }}
              className="sm:w-45!"
            />
          </div>
        )}

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <NotificationBell />
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {item.icon}
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen ? (
        <div className="border-t border-white/10 bg-brand px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <span className="[&_svg]:h-6 [&_svg]:w-6">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
