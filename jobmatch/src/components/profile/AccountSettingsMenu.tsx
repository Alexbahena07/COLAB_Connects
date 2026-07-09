"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function GearIcon() {
  return (
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't update your password. Try again.");
        return;
      }
      setSuccess("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Failed to change password", err);
      setError("Couldn't update your password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard title="Change password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          placeholder="Leave blank if you don't have one yet"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" className="btn-brand h-10 w-full" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </SectionCard>
  );
}

function ChangeEmailSection() {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/account/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword: currentPassword || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't update your email. Try again.");
        return;
      }
      setSuccess(true);
    } catch (err) {
      console.error("Failed to change email", err);
      setError("Couldn't update your email. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <SectionCard title="Change email">
        <p className="text-sm text-foreground/85">
          Your email has been updated. Please sign in again with your new email.
        </p>
        <Button
          className="btn-brand mt-4 h-10 w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign in again
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Change email">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="New email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          placeholder="Leave blank if you don't have one yet"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="btn-brand h-10 w-full" isLoading={isSubmitting}>
          Update email
        </Button>
      </form>
    </SectionCard>
  );
}

export default function AccountSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <GearIcon />
        Settings
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
        aria-label="Account settings"
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Account</p>
            <h2 className="mt-0.5 text-xl font-bold text-foreground">Settings</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close settings panel"
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

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <ChangePasswordSection />
            <ChangeEmailSection />
            <SectionCard title="Sign out">
              <p className="text-sm text-foreground/70">
                You'll need to sign in again the next time you visit.
              </p>
              <Button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="mt-4 h-10 w-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </Button>
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}
