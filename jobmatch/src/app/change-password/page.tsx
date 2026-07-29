"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your temporary password"),
    newPassword: z.string().min(8, "At least 8 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a different password than the temporary one",
    path: ["newPassword"],
  });
type FormData = z.infer<typeof ChangePasswordSchema>;

export default function ChangePasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });

    if (res.ok) {
      // Sign out so the next login issues a fresh session token without the
      // must-change-password flag.
      await signOut({ callbackUrl: "/login" });
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
          <h1 className="text-2xl font-semibold mb-1">Set a new password</h1>
          <p className="text-sm opacity-80 mb-6">
            You&apos;re using a temporary password. Choose your own to continue —
            you&apos;ll log in again with it afterward.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Temporary password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="The password you were given"
              {...register("currentPassword")}
              error={errors.currentPassword?.message}
            />

            <Input
              label="New password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("newPassword")}
              error={errors.newPassword?.message}
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
              label="Confirm new password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />

            {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}

            <Button type="submit" isLoading={isSubmitting} className="btn-brand w-full">
              Update password
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
