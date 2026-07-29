"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "This verification link is missing or malformed."
  );
  const fired = useRef(false);

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
      <p className="text-center text-sm opacity-80">
        Log in to request a new verification email, or{" "}
        <Link href="/register" className="font-medium underline">
          register again
        </Link>
        .
      </p>
      <Link
        href="/login"
        className="btn-brand mt-4 block w-full rounded-md py-2 text-center font-medium"
      >
        Go to log in
      </Link>
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
