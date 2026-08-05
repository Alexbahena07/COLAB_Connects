"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusherClient";

type MessagesLinkProps = {
  // "icon" is the compact top-bar button; "row" matches the full-width,
  // label-visible style used in the mobile menu list.
  variant?: "icon" | "row";
  onNavigate?: () => void;
};

export default function MessagesLink({ variant = "icon", onNavigate }: MessagesLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [me, setMe] = useState<string | null>(null);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return;
      setUnreadCount(typeof payload?.totalUnread === "number" ? payload.totalUnread : 0);
      setMe(typeof payload?.me === "string" ? payload.me : null);
    } catch (err) {
      console.error("Failed to load unread messages", err);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadUnreadCount();
    };
    refresh();
    // Polling fallback for when Pusher isn't configured or disconnects.
    const interval = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${me}`;
    const channel = pusher.subscribe(channelName);
    const onNewMessage = () => loadUnreadCount();
    channel.bind("message:new", onNewMessage);
    return () => {
      channel.unbind("message:new", onNewMessage);
      // The messages page shares this channel; leave the subscription alive.
    };
  }, [me]);

  const icon = (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-8 w-8"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z" />
    </svg>
  );

  if (variant === "row") {
    return (
      <Link
        href="/messages"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <span className="relative [&_svg]:h-6 [&_svg]:w-6">
          {icon}
          {unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </span>
        Messages
      </Link>
    );
  }

  return (
    <Link
      href="/messages"
      className="relative inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition hover:bg-white/10"
      aria-label="Messages"
    >
      {icon}
      <span className="hidden text-xs font-semibold lg:inline">Messages</span>
      {unreadCount > 0 ? (
        <span className="absolute right-3 top-3 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
