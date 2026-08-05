"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/support";
import {
  ACCOUNT_DELETION_REASONS,
  ACCOUNT_DELETION_REASON_LABELS,
  type AccountDeletionReason,
} from "@/lib/accountDeletion";

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

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SectionCard({
  title,
  variant = "default",
  children,
}: {
  title: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  const isDanger = variant === "danger";
  return (
    <section
      className={[
        "rounded-3xl border p-6 shadow-sm ring-1",
        isDanger ? "border-red-200 bg-red-50/40 ring-red-100" : "border-border bg-surface ring-black/5",
      ].join(" ")}
    >
      <h2
        className={[
          "flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide",
          isDanger ? "text-red-700" : "text-brand",
        ].join(" ")}
      >
        {isDanger ? <WarningIcon /> : null}
        {title}
      </h2>
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
          Check the inbox of your new address — we sent a confirmation link.
          Your login email only changes after you click it (the link expires in
          1 hour).
        </p>
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
          placeholder="••••••••"
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

function NotificationPreferencesSection() {
  const [frequency, setFrequency] = useState<"NONE" | "DAILY" | "WEEKLY">("WEEKLY");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState<"frequency" | "newsletter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications/preference", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!active || !res.ok) return;
        if (body?.frequency === "NONE" || body?.frequency === "DAILY" || body?.frequency === "WEEKLY") {
          setFrequency(body.frequency);
        }
        if (typeof body?.newsletterOptIn === "boolean") {
          setNewsletterOptIn(body.newsletterOptIn);
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const savePreference = async (
    field: "frequency" | "newsletter",
    body: { frequency?: "NONE" | "DAILY" | "WEEKLY"; newsletterOptIn?: boolean }
  ) => {
    setSavingField(field);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/notifications/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "Couldn't save your preference.");
        return;
      }
      setSuccess("Saved.");
    } catch (err) {
      console.error("Failed to save notification preference", err);
      setError("Couldn't save your preference.");
    } finally {
      setSavingField(null);
    }
  };

  return (
    <SectionCard title="Notification preferences">
      <div className="divide-y divide-border">
        <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 sm:max-w-xs">
            <p className="text-sm font-medium text-foreground">Job alert frequency</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              How often you get emailed about new job postings from companies you follow.
            </p>
          </div>
          <select
            id="job-alert-frequency"
            value={frequency}
            onChange={(e) => {
              const next = e.target.value as "NONE" | "DAILY" | "WEEKLY";
              setFrequency(next);
              savePreference("frequency", { frequency: next });
            }}
            disabled={isLoading || savingField === "frequency"}
            className="h-10 w-full shrink-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand disabled:opacity-60 sm:w-36"
          >
            <option value="NONE">None</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 sm:max-w-xs">
            <p className="text-sm font-medium text-foreground">Website newsletter</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Occasional emails about new features, product updates, and announcements.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={newsletterOptIn}
            disabled={isLoading || savingField === "newsletter"}
            onClick={() => {
              const next = !newsletterOptIn;
              setNewsletterOptIn(next);
              savePreference("newsletter", { newsletterOptIn: next });
            }}
            className="flex shrink-0 items-center gap-2 disabled:opacity-60"
          >
            <span
              className={[
                "inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                newsletterOptIn ? "bg-brand" : "bg-border",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                  newsletterOptIn ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </span>
            <span className="w-20 text-left text-sm text-foreground">
              {newsletterOptIn ? "Subscribed" : "Unsubscribed"}
            </span>
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}
    </SectionCard>
  );
}

function ContactSupportSection() {
  const [category, setCategory] = useState<SupportCategory>(SUPPORT_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 10) {
      setError("Tell us a bit more (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't send your request. Try again.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to send support request", err);
      setError("Couldn't send your request. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SectionCard title="Contact support">
        <p className="text-sm text-foreground/85">
          Thanks — we've received your request and sent it to support@colabconnects.app.
          Our team typically responds within 5–7 business days.
        </p>
        <Button
          type="button"
          className="btn-outline-brand mt-4 h-10 w-full"
          onClick={() => {
            setSubmitted(false);
            setMessage("");
            setCategory(SUPPORT_CATEGORIES[0]);
          }}
        >
          Send another request
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Contact support">
      <p className="text-sm text-foreground/70">
        Reach out to support@colabconnects.app and we'll follow up by email — typically
        within 5–7 business days.
      </p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="support-category" className="block text-sm font-medium text-foreground">
            What's this about?
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
          >
            {SUPPORT_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="support-message" className="block text-sm font-medium text-foreground">
            Message
          </label>
          <textarea
            id="support-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue you're running into..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground/50 focus:border-brand"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="btn-brand h-10 w-full" isLoading={isSubmitting}>
          Send request
        </Button>
      </form>
    </SectionCard>
  );
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState<AccountDeletionReason | "">("");
  const [otherReason, setOtherReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeConfirm = () => {
    setShowConfirm(false);
    setPassword("");
    setConfirmationText("");
    setReason("");
    setOtherReason("");
    setError(null);
  };

  const canSubmit =
    confirmationText === "DELETE" && Boolean(reason) && (reason !== "OTHER" || otherReason.trim().length > 0);

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password || undefined,
          confirmation: confirmationText,
          reason: reason || undefined,
          otherReason: reason === "OTHER" ? otherReason.trim() : undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't delete your account. Try again.");
        return;
      }
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      console.error("Failed to delete account", err);
      setError("Couldn't delete your account. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SectionCard title="Delete account" variant="danger">
      <p className="text-sm text-red-950/70">
        Permanently delete your account and all associated data — profile, applications, saved
        jobs, and messages.{" "}
        <span className="font-semibold text-red-700">This can't be undone.</span>
      </p>
      <Button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="btn-brand mt-4 h-8 w-auto px-4 text-xs"
      >
        Delete account
      </Button>

      {showConfirm ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm account deletion"
            className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Delete your account?</h3>
            <p className="mt-2 text-sm text-muted">
              This permanently deletes your account and all associated data. This action cannot
              be undone.
            </p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="delete-reason" className="block text-sm font-medium text-foreground">
                  Why are you leaving?
                </label>
                <select
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AccountDeletionReason)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="" disabled>
                    Select a reason…
                  </option>
                  {ACCOUNT_DELETION_REASONS.map((option) => (
                    <option key={option} value={option}>
                      {ACCOUNT_DELETION_REASON_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
              {reason === "OTHER" ? (
                <Input
                  label="Tell us more"
                  type="text"
                  autoComplete="off"
                  placeholder="What's the main reason?"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                />
              ) : null}
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                placeholder="Leave blank if you don't have one"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label={'Type "DELETE" to confirm'}
                type="text"
                autoComplete="off"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
              />
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" className="btn-outline-brand h-10" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting || !canSubmit}
                onClick={handleDelete}
                className="h-10 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Delete my account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
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
        aria-label="Settings"
        title="Settings"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <GearIcon />
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
            <NotificationPreferencesSection />
            <ContactSupportSection />
            <SectionCard title="Sign out">
              <p className="text-sm text-foreground/70">
                You'll need to sign in again the next time you visit.
              </p>
              <Button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="btn-outline-brand mt-4 h-10 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </Button>
            </SectionCard>
            <DeleteAccountSection />
          </div>
        </div>
      </div>
    </>
  );
}
