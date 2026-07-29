"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
type FormData = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      const body = await res.json().catch(() => null);
      setServerError(body?.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-brand px-4">
        <div className="card">
          {submitted ? (
            <>
              <h1 className="text-2xl font-semibold mb-1">Check your email</h1>
              <p className="text-sm opacity-80 mb-6">
                If an account exists for that email, we&apos;ve sent a link to reset
                your password. The link expires in 30 minutes.
              </p>
              <p className="text-center text-sm opacity-80">
                <Link href="/login" className="font-medium underline">
                  Back to log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold mb-1">Forgot your password?</h1>
              <p className="text-sm opacity-80 mb-6">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  error={errors.email?.message}
                />

                {serverError ? (
                  <p className="text-sm text-red-500">{serverError}</p>
                ) : null}

                <Button type="submit" isLoading={isSubmitting} className="btn-brand w-full">
                  Send reset link
                </Button>
              </form>

              <p className="mt-6 text-center text-sm opacity-80">
                Remembered it?{" "}
                <Link href="/login" className="font-medium underline">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
