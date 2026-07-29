"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onBlur",
  });

  if (!token) {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Invalid link</h1>
        <p className="text-sm opacity-80 mb-6">
          This password reset link is missing or malformed. Please request a new one.
        </p>
        <p className="text-center text-sm opacity-80">
          <Link href="/forgot-password" className="font-medium underline">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Password updated</h1>
        <p className="text-sm opacity-80 mb-6">
          Your password has been reset. You can now log in with your new password.
        </p>
        <Link href="/login" className="btn-brand block w-full rounded-md py-2 text-center font-medium">
          Go to log in
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const body = await res.json().catch(() => null);
      setServerError(body?.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-1">Choose a new password</h1>
      <p className="text-sm opacity-80 mb-6">Enter a new password for your account</p>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="New password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...register("password")}
          error={errors.password?.message}
          rightSection={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="text-sm opacity-90"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          }
        />

        <Input
          label="Confirm password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />

        {serverError ? (
          <p className="text-sm text-red-500">
            {serverError}{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
          </p>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} className="btn-brand w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-brand px-4">
        <Suspense fallback={<div className="card"><p className="text-sm opacity-70">Loading...</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  );
}
