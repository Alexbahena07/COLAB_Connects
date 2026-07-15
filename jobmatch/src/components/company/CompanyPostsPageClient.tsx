"use client";

import { ReactNode, Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import JobsPageClient from "@/components/company/JobsPageClient";
import CompanyEventPostsManager from "@/components/company/CompanyEventPostsManager";
import { canPostEvents as getCanPostEvents, SponsorTier } from "@/lib/sponsorTier";
import { PostsFilterBar } from "@/components/company/PostsPanelShell";

type PostTab = "jobs" | "events";

const JobsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <rect x="4" y="7" width="16" height="11" rx="2" />
    <path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7" />
  </svg>
);

const EventsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
  </svg>
);

const LockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

function PostTypeSwitcher({
  activeTab,
  canPostEvents,
  onChange,
}: {
  activeTab: PostTab;
  canPostEvents: boolean;
  onChange: (tab: PostTab) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-brand/15 bg-white p-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("jobs")}
        aria-pressed={activeTab === "jobs"}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
          activeTab === "jobs"
            ? "bg-brand text-white shadow-md shadow-brand/25"
            : "text-brand/70 hover:bg-brand/5 hover:text-brand"
        }`}
      >
        {JobsIcon}
        Jobs
      </button>
      <button
        type="button"
        onClick={() => onChange("events")}
        aria-pressed={activeTab === "events"}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
          activeTab === "events"
            ? "bg-brand text-white shadow-md shadow-brand/25"
            : "text-brand/70 hover:bg-brand/5 hover:text-brand"
        }`}
      >
        {EventsIcon}
        Events
        {!canPostEvents ? (
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-1 ${
              activeTab === "events" ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
            }`}
          >
            {LockIcon}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function EventsUpsell({ switcher }: { switcher?: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col bg-background text-foreground md:min-h-0 md:overflow-hidden">
      <PostsFilterBar
        title="Manage event posts"
        subtitle="Promote recruiting nights, info sessions, and other events directly on the student listings feed."
        switcher={switcher}
      />

      <div className="flex flex-1 items-start justify-center p-4 md:min-h-0 md:overflow-y-auto md:p-10">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            {EventsIcon}
          </span>
          <h3 className="mt-3 text-base font-bold text-foreground">
            Posting events is a Gold+ sponsor feature
          </h3>
          <p className="mt-2 text-sm text-foreground/70">
            Event posts let you promote recruiting nights, info sessions, and other events
            directly on the student job listings page. It&apos;s available to Gold and Platinum
            sponsors.
          </p>
          <Link
            href="/dashboard/company/application#sponsorship"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            See sponsorship tiers
          </Link>
        </div>
      </div>
    </main>
  );
}

function CompanyPostsPageClientInner({ sponsorTier }: { sponsorTier: SponsorTier }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventsAllowed = getCanPostEvents(sponsorTier);
  const initialTab: PostTab = searchParams.get("tab") === "events" ? "events" : "jobs";
  const [activeTab, setActiveTab] = useState<PostTab>(initialTab);

  const handleTabChange = (tab: PostTab) => {
    setActiveTab(tab);
    router.replace(tab === "events" ? `${pathname}?tab=events` : pathname, { scroll: false });
  };

  const switcher = (
    <PostTypeSwitcher activeTab={activeTab} canPostEvents={eventsAllowed} onChange={handleTabChange} />
  );

  // Both panes stay mounted (toggled via CSS) rather than swapped in the tree, so switching
  // tabs doesn't discard in-progress form input or re-trigger each panel's data fetch.
  return (
    <div className="flex flex-1 flex-col md:min-h-0 md:overflow-hidden">
      <div className={activeTab === "jobs" ? "contents" : "hidden"}>
        <JobsPageClient sponsorTier={sponsorTier} switcher={switcher} />
      </div>
      <div className={activeTab === "events" ? "contents" : "hidden"}>
        {eventsAllowed ? (
          <CompanyEventPostsManager switcher={switcher} />
        ) : (
          <EventsUpsell switcher={switcher} />
        )}
      </div>
    </div>
  );
}

export default function CompanyPostsPageClient({ sponsorTier }: { sponsorTier: SponsorTier }) {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <CompanyPostsPageClientInner sponsorTier={sponsorTier} />
    </Suspense>
  );
}
