"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/ui/HeaderWithIcons";
import Footer from "@/components/ui/Footer";

type NotificationType =
  | "NEW_JOB"
  | "NEW_EVENT"
  | "SPONSOR_TIER_UPGRADED"
  | "COMPANY_APPROVED"
  | "APPLICANT_MILESTONE"
  | "APPLICATION_STATUS_CHANGED";

type JobApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "INTERVIEWING" | "OFFERED" | "HIRED" | "REJECTED";

type NotificationItem = {
  id: string;
  type: NotificationType;
  jobId: string | null;
  companyId: string | null;
  jobTitle: string | null;
  eventPostId: string | null;
  eventTitle: string | null;
  sponsorTier: "FREE" | "SILVER" | "GOLD" | "PLATINUM" | null;
  milestoneCount: number | null;
  applicationStatus: JobApplicationStatus | null;
  companyName: string | null;
  createdAt: string;
  readAt: string | null;
};

type FollowedCompany = {
  companyId: string;
  companyName: string;
  companyImage: string | null;
  followedAt: string;
};

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "";
  return parsed.toLocaleString();
};

const tierLabel = (tier: NotificationItem["sponsorTier"]) => {
  if (!tier) return null;
  return tier.charAt(0) + tier.slice(1).toLowerCase();
};

const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEWING: "Interviewing",
  OFFERED: "Offer extended",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const messageForNotification = (item: NotificationItem) => {
  const company = item.companyName ?? "A company";
  if (item.type === "NEW_JOB") {
    const title = item.jobTitle ?? "a new job";
    return `${company} posted ${title}.`;
  }
  if (item.type === "NEW_EVENT") {
    const title = item.eventTitle ?? "a new event";
    return `${company} posted a new event: ${title}.`;
  }
  if (item.type === "SPONSOR_TIER_UPGRADED") {
    const tier = tierLabel(item.sponsorTier);
    return tier
      ? `Your sponsorship plan was upgraded to ${tier}. New benefits are live on your profile.`
      : "Your sponsorship plan was upgraded.";
  }
  if (item.type === "COMPANY_APPROVED") {
    return "Your company account has been approved. You can now post jobs and events.";
  }
  if (item.type === "APPLICANT_MILESTONE") {
    const title = item.jobTitle ?? "Your job listing";
    if (item.milestoneCount === 1) {
      return `${title} just received its first applicant.`;
    }
    return `${title} has reached ${item.milestoneCount ?? "a new milestone of"} applicants.`;
  }
  if (item.type === "APPLICATION_STATUS_CHANGED") {
    const title = item.jobTitle ?? "your application";
    const stage = item.applicationStatus ? APPLICATION_STATUS_LABELS[item.applicationStatus] : "updated";
    return `${company} updated your application for ${title} to ${stage}.`;
  }
  return "You have a new notification.";
};

const getCompanyInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function NotificationsPage() {
  const { data: session } = useSession();
  const isCompany = session?.user?.accountType === "COMPANY";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<"NONE" | "DAILY" | "WEEKLY">("WEEKLY");
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  const [following, setFollowing] = useState<FollowedCompany[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [followingError, setFollowingError] = useState<string | null>(null);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

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

  const loadFollowing = async () => {
    setIsLoadingFollowing(true);
    setFollowingError(null);
    try {
      const response = await fetch("/api/companies/follows", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't load the companies you follow.";
        setFollowingError(message);
        return;
      }

      setFollowing(Array.isArray(payload?.companies) ? payload.companies : []);
    } catch (err) {
      console.error("Failed to load followed companies", err);
      setFollowingError("We couldn't load the companies you follow.");
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  useEffect(() => {
    if (isCompany) return;
    loadFollowing();
  }, [isCompany]);

  const unfollow = async (companyId: string) => {
    setUnfollowingId(companyId);
    try {
      const response = await fetch(`/api/companies/${companyId}/follow`, { method: "DELETE" });
      if (!response.ok) return;
      setFollowing((prev) => prev.filter((company) => company.companyId !== companyId));
    } catch (err) {
      console.error("Failed to unfollow company", err);
    } finally {
      setUnfollowingId(null);
    }
  };

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
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Notifications</h1>
              <p className="text-sm text-muted">
                {hasUnread ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-semibold text-brandBlue disabled:opacity-40"
              disabled={!hasUnread}
            >
              Mark all read
            </button>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-surface px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  Email frequency
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Choose how often you want to receive notification emails.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold text-foreground" htmlFor="notification-frequency">
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
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brandBlue"
                  disabled={prefLoading || prefSaving}
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
                {prefSaving ? (
                  <span className="text-xs text-muted">Saving...</span>
                ) : null}
              </div>
            </div>
            {prefError ? <p className="mt-3 text-sm text-red-500">{prefError}</p> : null}
            {prefSuccess ? <p className="mt-3 text-sm text-green-600">{prefSuccess}</p> : null}
          </section>

          {!isCompany ? (
          <section className="mt-6 rounded-2xl border border-border bg-surface px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Following
            </h2>
            <p className="mt-1 text-xs text-muted">
              Companies you follow show up here. You'll get notified when they post new jobs or
              events.
            </p>
            <div className="mt-4 space-y-2">
              {isLoadingFollowing ? (
                <p className="text-sm text-muted">Loading...</p>
              ) : followingError ? (
                <p className="text-sm text-red-500">{followingError}</p>
              ) : following.length === 0 ? (
                <p className="text-sm text-foreground/70">
                  You aren't following any companies yet. Follow a company from its profile page
                  to see their updates here.
                </p>
              ) : (
                following.map((company) => (
                  <div
                    key={company.companyId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-brand/10 text-xs font-bold text-brand">
                      {company.companyImage ? (
                        <img
                          src={company.companyImage}
                          alt={`${company.companyName} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getCompanyInitials(company.companyName)
                      )}
                    </div>
                    <Link
                      href={`/companies/${company.companyId}`}
                      className="min-w-0 flex-1 font-semibold text-foreground hover:underline"
                    >
                      {company.companyName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => unfollow(company.companyId)}
                      disabled={unfollowingId === company.companyId}
                      className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      {unfollowingId === company.companyId ? "Removing..." : "Unfollow"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
          ) : null}

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted">Loading notifications...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted">No notifications yet.</p>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const href =
                  item.type === "SPONSOR_TIER_UPGRADED"
                    ? "/dashboard/company/application#sponsorship"
                    : item.type === "COMPANY_APPROVED"
                    ? "/dashboard/company/profile"
                    : item.type === "APPLICANT_MILESTONE"
                    ? "/dashboard/company"
                    : item.jobId
                    ? `/dashboard?jobId=${item.jobId}`
                    : item.eventPostId
                    ? `/dashboard?eventId=${item.eventPostId}`
                    : "/dashboard";
                const ctaLabel =
                  item.type === "SPONSOR_TIER_UPGRADED"
                    ? "View Plan"
                    : item.type === "COMPANY_APPROVED"
                    ? "View Profile"
                    : item.type === "APPLICANT_MILESTONE"
                    ? "View Applicants"
                    : item.jobId
                    ? "View Job"
                    : item.eventPostId
                    ? "View Event"
                    : null;
                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl border px-4 py-3 transition ${
                      isUnread
                        ? "border-brandBlue bg-brandBlue/10"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {messageForNotification(item)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {formatTimestamp(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="rounded-full bg-brandBlue/20 px-2 py-1 text-[10px] font-semibold text-brandBlue">
                            New
                          </span>
                        )}
                        {ctaLabel && (
                          <Link
                            href={href}
                            onClick={() => markRead(item.id)}
                            className="rounded-full bg-brandBlue px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                          >
                            {ctaLabel}
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
