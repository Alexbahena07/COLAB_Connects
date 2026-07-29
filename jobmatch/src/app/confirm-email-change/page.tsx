"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";

type Status = "confirming" | "success" | "error";

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "confirming" : "error");
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "This confirmation link is missing or malformed."
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;

    (async () => {
      const res = await fetch("/api/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok) {
        setNewEmail(typeof body?.newEmail === "string" ? body.newEmail : null);
        setStatus("success");
      } else {
        setErrorMessage(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    })();
  }, [token]);

  if (status === "confirming") {
    return (
      <div className="card">
        <p className="text-sm opacity-70">Confirming your new email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Email updated</h1>
        <p className="text-sm opacity-80 mb-6">
          {newEmail
            ? `Your login email is now ${newEmail}. Use it the next time you sign in.`
            : "Your login email has been updated. Use the new address the next time you sign in."}
        </p>
        <Link href="/login" className="btn-brand block w-full rounded-md py-2 text-center font-medium">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-1">Confirmation failed</h1>
      <p className="text-sm opacity-80 mb-6">{errorMessage}</p>
      <Link href="/login" className="btn-brand block w-full rounded-md py-2 text-center font-medium">
        Go to log in
      </Link>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-brand px-4">
        <Suspense fallback={<div className="card"><p className="text-sm opacity-70">Loading...</p></div>}>
          <ConfirmEmailChangeContent />
        </Suspense>
      </main>
    </>
  );
}
