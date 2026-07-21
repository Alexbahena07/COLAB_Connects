'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const HomeIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6.5 10v7.5A2.5 2.5 0 0 0 9 20h6a2.5 2.5 0 0 0 2.5-2.5V10" />
  </svg>
);

const HowItWorksIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.5 12 2.2 2.2L15.5 9" />
  </svg>
);

const ForumIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10.5" r="1.75" />
    <path d="m5 17 4.5-4.5L12 15l3-3 4 5" />
  </svg>
);

const FeaturesIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="4.5" />
  </svg>
);

const SponsorsIcon = (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
    <path d="M7 11 3.5 14.5a2 2 0 0 0 2.83 2.83L9 14.5" />
    <path d="m10.5 13 2 2a2 2 0 0 0 2.83 0l3.67-3.67a2 2 0 0 0 0-2.83l-2-2" />
    <path d="M13 5.5 10.5 8a2 2 0 0 0 0 2.83l.67.67" />
    <path d="m14 3.5 2 2" />
  </svg>
);

const navItems: NavItem[] = [
  { href: "#top", label: "Home", icon: HomeIcon },
  { href: "#how-it-works", label: "How it works", icon: HowItWorksIcon },
  { href: "#forum", label: "Career Forum", icon: ForumIcon },
  { href: "#features", label: "Features", icon: FeaturesIcon },
  { href: "#sponsors", label: "Sponsors", icon: SponsorsIcon },
];

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Sections offset their anchor-scroll landing with scroll-margin-top, but
  // the sticky header's height varies with viewport (the logo scales down on
  // mobile) and a fixed offset leaves a sliver of the previous section
  // showing. Publish the measured height of the top bar (not the expandable
  // mobile menu panel) as a CSS variable the sections can use.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--home-header-h",
        `${bar.offsetHeight}px`
      );
    };
    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const id = href.slice(1);
    // Wait for the mobile menu panel to collapse (if open) before measuring
    // the target's position — otherwise the browser scrolls to where the
    // section was before the panel closed, landing short or past it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-brand text-brand">
      <div ref={barRef} className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Logo on the left, centered vertically */}
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

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {item.icon}
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
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
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
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
