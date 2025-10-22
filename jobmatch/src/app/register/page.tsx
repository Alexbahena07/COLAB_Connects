"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const RegisterSchema = z.object({
  accountType: z.enum(["student", "company"], {
    required_error: "Select an account type",
  }),
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormData = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(RegisterSchema),
      mode: "onBlur",
      defaultValues: { accountType: "student" },
    });

  const accountType = watch("accountType");

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    // 1) Create the user
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body?.error || "Failed to register");
      return;
    }

    // 2) Immediately sign them in with the same credentials
    const signin = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false, // we'll route manually
    });

    if (signin && !signin.error) {
      const nextRoute = data.accountType === "company" ? "/dashboard/company" : "/onboarding/profile";
      router.push(nextRoute);
    } else {
      // If auto-login fails (should be rare), fall back to login page
      setServerError("Account created, but sign-in failed. Please log in.");
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-[--brand] px-4">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Create an account</h1>
        <p className="text-sm text-gray-600 mb-6">Register below to continue</p>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset className="rounded-xl border border-[--border] bg-[--surface] p-4">
            <legend className="px-1 text-sm font-semibold text-[--foreground]">Account type</legend>
            <p className="mt-1 text-xs text-gray-600">Tell us whether you&apos;re joining as a student or on behalf of a company.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-[--surface] p-3 text-sm transition hover:border-[--brandBlue] ${accountType === "student" ? "border-[--brandBlue] ring-2 ring-[--brandBlue]" : "border-[--border] ring-0"}`}
              >
                <input
                  type="radio"
                  value="student"
                  {...register("accountType")}
                  className="mt-1 h-4 w-4"
                  aria-describedby="account-type-student"
                />
                <span id="account-type-student">
                  <span className="font-semibold text-[--foreground]">Student</span>
                  <span className="mt-1 block text-xs text-gray-600">Personalized profile builder and job-matching tools.</span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-[--surface] p-3 text-sm transition hover:border-[--brandBlue] ${accountType === "company" ? "border-[--brandBlue] ring-2 ring-[--brandBlue]" : "border-[--border] ring-0"}`}
              >
                <input
                  type="radio"
                  value="company"
                  {...register("accountType")}
                  className="mt-1 h-4 w-4"
                  aria-describedby="account-type-company"
                />
                <span id="account-type-company">
                  <span className="font-semibold text-[--foreground]">Company</span>
                  <span className="mt-1 block text-xs text-gray-600">Post roles, manage applicants, and share your brand story.</span>
                </span>
              </label>
            </div>

            {errors.accountType ? (
              <p className="mt-2 text-xs text-red-600">{errors.accountType.message}</p>
            ) : null}
          </fieldset>

          <Input
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="someone@example.com"
            {...register("email")}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...register("password")}
            error={errors.password?.message}
          />

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          <Button type="submit" isLoading={isSubmitting} className="bg-[--brand] text-white">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
