"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

type NotificationType = "NEW_JOB";

type NotificationItem = {
  id: string;
  type: NotificationType;
  jobId: string | null;
  companyId: string | null;
  jobTitle: string | null;
  companyName: string | null;
  createdAt: string;
  readAt: string | null;
};

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "";
  return parsed.toLocaleString();
};

const messageForNotification = (item: NotificationItem) => {
  if (item.type === "NEW_JOB") {
    const company = item.companyName ?? "A company";
    const title = item.jobTitle ?? "a new job";
    return `${company} posted ${title}.`;
  }
  return "You have a new notification.";
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<"NONE" | "DAILY" | "WEEKLY">("WEEKLY");
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  const hasUnread = unreadCount > 0;

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't load notifications.";
        setError(message);
        return;
      }

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
      setUnreadCount(typeof payload?.unreadCount === "number" ? payload.unreadCount : 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setError("We couldn't load notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    let active = true;
    const loadPreference = async () => {
      setPrefLoading(true);
      setPrefError(null);
      try {
        const response = await fetch("/api/notifications/preference", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const message =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load your notification settings.";
          setPrefError(message);
          return;
        }

        const value = payload?.frequency;
        if (value === "NONE" || value === "DAILY" || value === "WEEKLY") {
          setFrequency(value);
        }
      } catch (err) {
        console.error("Failed to load notification preference", err);
        if (!active) return;
        setPrefError("We couldn't load your notification settings.");
      } finally {
        if (active) {
          setPrefLoading(false);
        }
      }
    };

    loadPreference();
    return () => {
      active = false;
    };
  }, []);

  const savePreference = async (nextFrequency: "NONE" | "DAILY" | "WEEKLY") => {
    setPrefSaving(true);
    setPrefError(null);
    setPrefSuccess(null);
    try {
      const response = await fetch("/api/notifications/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: nextFrequency }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't update your notification settings.";
        setPrefError(message);
        return;
      }

      setPrefSuccess("Notification settings saved.");
    } catch (err) {
      console.error("Failed to save notification preference", err);
      setPrefError("We couldn't update your notification settings.");
    } finally {
      setPrefSaving(false);
    }
  };

  const markAllRead = async () => {
    if (!hasUnread) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) return;
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const markRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!response.ok) return;
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[--background] text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Notifications</h1>
              <p className="text-sm text-white/70">
                {hasUnread ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-semibold text-white/90 disabled:opacity-50"
              disabled={!hasUnread}
            >
              Mark all read
            </button>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  Email frequency
                </h2>
                <p className="mt-1 text-xs text-white/70">
                  Choose how often you want to receive notification emails.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold text-white/80" htmlFor="notification-frequency">
                  Frequency
                </label>
                <select
                  id="notification-frequency"
                  value={frequency}
                  onChange={(event) => {
                    const nextValue = event.target.value as "NONE" | "DAILY" | "WEEKLY";
                    setFrequency(nextValue);
                    savePreference(nextValue);
                  }}
                  className="h-10 rounded-xl border border-white/30 bg-white/10 px-3 text-sm text-white"
                  disabled={prefLoading || prefSaving}
                >
                  <option value="NONE" className="text-black">
                    None
                  </option>
                  <option value="DAILY" className="text-black">
                    Daily
                  </option>
                  <option value="WEEKLY" className="text-black">
                    Weekly
                  </option>
                </select>
                {prefSaving ? (
                  <span className="text-xs text-white/70">Saving...</span>
                ) : null}
              </div>
            </div>
            {prefError ? <p className="mt-3 text-sm text-red-500">{prefError}</p> : null}
            {prefSuccess ? <p className="mt-3 text-sm text-green-500">{prefSuccess}</p> : null}
          </section>

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <p className="text-sm text-white/70">Loading notifications...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-white/70">No notifications yet.</p>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const href = item.jobId ? `/dashboard?jobId=${item.jobId}` : "/dashboard";
                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl border px-4 py-3 transition ${
                      isUnread
                        ? "border-[--brandBlue] bg-[--brandBlue]/10"
                        : "border-[--border] bg-white/5 text-white/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {messageForNotification(item)}
                        </p>
                        <p className="mt-1 text-xs text-white/70">
                          {formatTimestamp(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="rounded-full bg-[--brandBlue]/20 px-2 py-1 text-[10px] font-semibold text-[--brandBlue]">
                            New
                          </span>
                        )}
                        {item.jobId && (
                          <Link
                            href={href}
                            onClick={() => markRead(item.id)}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
                          >
                            View Job
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
