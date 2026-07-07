"use client";

import { useEffect, useRef, useState } from "react";
import CompanyProfileForm from "@/app/onboarding/company/company-form";
import CompanyProfilePhotoEditor from "@/components/company/CompanyProfilePhotoEditor";

type CompanyEditDrawerProps = {
  profilePhoto: string | null;
};

export default function CompanyEditDrawer({ profilePhoto }: CompanyEditDrawerProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit profile
      </button>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit company profile"
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Company profile
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-foreground">Edit profile</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="company-profile-form"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brandBlue px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            >
              Save and continue
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close edit panel"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted transition hover:bg-border/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brandBlue"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Company logo</h2>
              <p className="mt-1 text-sm text-muted">Upload a logo that represents your firm.</p>
              <div className="mt-5">
                <CompanyProfilePhotoEditor initialImage={profilePhoto} />
              </div>
            </section>
            <CompanyProfileForm />
          </div>
        </div>
      </div>
    </>
  );
}
