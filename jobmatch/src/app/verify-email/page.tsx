"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "This verification link is missing or malformed."
  );
  const fired = useRef(false);

  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  // Blocks repeat clicks for a minute: each resend invalidates the previous
  // email's link, so spamming this button leaves the next link dead too.
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = resendEmail.trim().toLowerCase();
    if (!email || resendStatus === "sending" || resendCooldown > 0) return;

    setResendError(null);
    setResendStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setResendError(body?.error ?? "Something went wrong. Please try again.");
        setResendStatus("idle");
        return;
      }
      setResendStatus("sent");
      setResendCooldown(60);
    } catch {
      setResendError("Something went wrong. Please try again.");
      setResendStatus("idle");
    }
  };

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;

    (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json().catch(() => null);
        setErrorMessage(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    })();
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="card">
        <p className="text-sm opacity-70">Verifying your email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Email verified</h1>
        <p className="text-sm opacity-80 mb-6">
          Your email has been verified. You can now log in to your account.
        </p>
        <Link href="/login" className="btn-brand block w-full rounded-md py-2 text-center font-medium">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-1">Verification failed</h1>
      <p className="text-sm opacity-80 mb-6">{errorMessage}</p>

      {resendStatus === "sent" ? (
        <p className="mb-4 text-sm font-medium">
          If that email is registered and unverified, a new link is on its way. Use the link in
          the most recent email — each resend replaces the previous one.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={handleResend}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={resendEmail}
            onChange={(event) => setResendEmail(event.target.value)}
            error={resendError ?? undefined}
          />
          <Button
            type="submit"
            isLoading={resendStatus === "sending"}
            disabled={resendCooldown > 0}
            className="btn-brand w-full"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : "Resend verification email"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm opacity-80">
        Already verified?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
        , or{" "}
        <Link href="/register" className="font-medium underline">
          register again
        </Link>
        .
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-brand px-4">
        <Suspense fallback={<div className="card"><p className="text-sm opacity-70">Loading...</p></div>}>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </>
  );
}
