"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/events", label: "Events" },
];

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-brand text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/admin" className="text-sm font-bold tracking-wide">
          COLAB Admin
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard" className="text-xs font-medium text-white/70 hover:text-white">
          Exit admin
        </Link>
      </div>
    </header>
  );
}
