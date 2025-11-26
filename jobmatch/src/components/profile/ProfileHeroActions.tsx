"use client";

import { useState } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import ProfileForm from "@/app/onboarding/profile/profile-form";

type ProfileHeroActionsProps = {
  redirectTo?: string;
};

export default function ProfileHeroActions({ redirectTo = "/dashboard/profile" }: ProfileHeroActionsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="bg-[--brand] text-white hover:opacity-90 focus:ring-[--brand] focus:ring-offset-[--surface]"
        >
          Edit Profile
        </Button>
        <Button
          type="button"
          className="border border-[--border] bg-[--surface] text-[--foreground] hover:bg-[--background] focus:ring-[--brandBlue] focus:ring-offset-[--surface]"
        >
          Share
        </Button>
      </div>

      {isDrawerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-[--border] bg-[--surface] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-[--brandBlue] bg-[--brandBlue] px-6 py-4 text-white">
              <h2 className="text-lg font-semibold">Edit Profile</h2>
              <Button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="border border-transparent bg-transparent text-white hover:bg-[--brandBlue]/80 focus:ring-white focus:ring-offset-[--brandBlue]"
              >
                Close
              </Button>
            </header>

            <div className="px-6 py-6">
              <ProfileForm redirectTo={redirectTo} />
            </div>
          </div>
        </div>
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
        "flex items-center gap-2 rounded-full border border-[--border] px-3 py-1 text-xs font-semibold transition",
        enabled
          ? "bg-[--brandBlue] text-white shadow-sm"
          : "bg-[--surface] text-[--foreground] opacity-80 hover:opacity-100"
      )}
    >
      <span
        className={clsx(
          "inline-block h-2.5 w-2.5 rounded-full transition",
          enabled ? "bg-white" : "bg-[--border]"
        )}
      />
      {enabled ? "Open to work" : "Not openly looking"}
    </button>
  );
}
