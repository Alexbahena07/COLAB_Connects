"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormData = z.infer<typeof LoginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res && !res.error) {
      const callbackUrl = searchParams.get("callbackUrl");
      const session = await getSession();
      const accountType = session?.user?.accountType;
      const defaultRoute =
        accountType === "COMPANY" ? "/dashboard/company/profile" : "/dashboard/profile";
      // A hard navigation (not router.push) is required here: Next.js caches
      // rendered Server Component payloads per-URL on the client, independent
      // of the session cookie. A soft navigation right after sign-in can
      // replay a page cached under a previous account's session in this tab.
      window.location.href = callbackUrl ?? defaultRoute;
    } else {
      setServerError("Invalid email or password");
    }
  };

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm opacity-80 mb-6">Log in to your account</p>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register("email")}
          error={errors.email?.message}
        />

        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
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

        {serverError ? (
          <p className="text-sm text-red-500">{serverError}</p>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} className="btn-brand w-full">
          Log in
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <p className="text-center text-sm opacity-80">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-brand px-4">
        <Suspense fallback={<div className="card"><p className="text-sm opacity-70">Loading...</p></div>}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
