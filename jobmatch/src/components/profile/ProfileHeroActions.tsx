"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

export default function ProfileHeroActions() {
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const handleShare = async () => {
    setShareError(null);
    setShareNotice(null);

    const url = typeof window !== "undefined" ? window.location.href : "/dashboard/profile";
    const title = "COLAB profile";
    const text = "View my COLAB profile.";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice("Link copied.");
        return;
      }

      setShareError("Sharing isn't supported in this browser.");
    } catch (error) {
      // The user dismissing the native share sheet isn't a failure — don't show an error for it.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Share failed", error);
      setShareError("Unable to share right now.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
      {shareNotice ? (
        <span className="text-xs font-medium text-white/80">{shareNotice}</span>
      ) : null}
      {shareError ? (
        <span className="text-xs font-medium text-red-300">{shareError}</span>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}

export function OpenToWorkToggle({ initialValue = true }: { initialValue?: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/open-to-work", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openToWork: next }),
      });
      if (!res.ok) {
        setEnabled(!next);
        const body = await res.json().catch(() => null);
        setError(body?.error || "Couldn't save. Try again.");
      }
    } catch (err) {
      console.error("Failed to update open-to-work status", err);
      setEnabled(!next);
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={saving}
        onClick={handleToggle}
        className={clsx(
          "flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold transition disabled:opacity-60",
          enabled
            ? "bg-brandBlue text-white shadow-sm"
            : "bg-surface text-foreground opacity-80 hover:opacity-100"
        )}
      >
        <span
          className={clsx(
            "inline-block h-2.5 w-2.5 rounded-full transition",
            enabled ? "bg-white" : "bg-border"
          )}
        />
        {enabled ? "Open to work" : "Not openly looking"}
      </button>
      {error ? <span className="text-xs font-medium text-red-300">{error}</span> : null}
    </>
  );
}
