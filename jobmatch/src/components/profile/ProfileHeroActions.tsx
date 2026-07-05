"use client";

import { useState } from "react";
import clsx from "clsx";

export default function ProfileHeroActions() {
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

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
    </>
  );
}

export function OpenToWorkToggle() {
  const [enabled, setEnabled] = useState(true);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled((state) => !state)}
      className={clsx(
        "flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold transition",
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
  );
}
