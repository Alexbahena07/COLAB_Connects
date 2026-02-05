"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";

type ProfileHeroActionsProps = {
  redirectTo?: string;
};

export default function ProfileHeroActions({ redirectTo: _redirectTo = "/dashboard/profile" }: ProfileHeroActionsProps) {
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("profile-editing");
      }
    };
  }, []);

  const handleEdit = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("profile-editing");
    const target = document.getElementById("profile-edit");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      console.error("Share failed", error);
      setShareError("Unable to share right now.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleEdit}
          className="bg-[var(--brand)] text-white hover:opacity-90 focus:ring-[var(--brand)] focus:ring-offset-[var(--surface)]"
        >
          Edit Profile
        </Button>
        <Button
          type="button"
          onClick={handleShare}
          className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--background)] focus:ring-[var(--brandBlue)] focus:ring-offset-[var(--surface)]"
        >
          Share
        </Button>
        {shareNotice ? <span className="text-xs text-[var(--foreground)]/70">{shareNotice}</span> : null}
        {shareError ? <span className="text-xs text-red-400">{shareError}</span> : null}
      </div>

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
        "flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold transition",
        enabled
          ? "bg-[var(--brandBlue)] text-white shadow-sm"
          : "bg-[var(--surface)] text-[var(--foreground)] opacity-80 hover:opacity-100"
      )}
    >
      <span
        className={clsx(
          "inline-block h-2.5 w-2.5 rounded-full transition",
          enabled ? "bg-white" : "bg-[var(--border)]"
        )}
      />
      {enabled ? "Open to work" : "Not openly looking"}
    </button>
  );
}
