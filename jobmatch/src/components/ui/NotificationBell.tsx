"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const hasUnread = unreadCount > 0;

  const loadUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?limit=1", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      setUnreadCount(typeof payload?.unreadCount === "number" ? payload.unreadCount : 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadUnreadCount();
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
      aria-label="Notifications"
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
        <path d="M6 17h12" />
        <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        <path d="M8 9a4 4 0 1 1 8 0c0 4 2 4 2 6H6c0-2 2-2 2-6Z" />
      </svg>
      <span className="text-xs font-semibold">Notifications</span>
      {hasUnread ? (
        <span className="absolute right-3 top-3 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
