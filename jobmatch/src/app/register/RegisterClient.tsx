"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const RegisterSchema = z
  .object({
    accountType: z.enum(["student", "company"], {
      required_error: "Select an account type",
    }),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
  })
  .superRefine((value, ctx) => {
    if (value.accountType === "company") {
      if (!value.companyName || value.companyName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message: "Enter your company name",
        });
      }
    } else {
      if (!value.firstName || value.firstName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["firstName"],
          message: "Enter your first name",
        });
      }
      if (!value.lastName || value.lastName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["lastName"],
          message: "Enter your last name",
        });
      }
    }
  });

type RegisterFormData = z.infer<typeof RegisterSchema>;

export default function RegisterClient() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  // Blocks repeat clicks for a minute: each resend invalidates the previous
  // email's link, so spamming this button leaves users clicking a dead link
  // in an earlier email instead of the newest one.
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    mode: "onBlur",
    defaultValues: { accountType: "student", firstName: "", lastName: "", companyName: "" },
  });

  const accountType = watch("accountType");

  useEffect(() => {
    const accountTypeParam = searchParams?.get("type");
    if (accountTypeParam === "company") {
      setValue("accountType", "company", { shouldValidate: true });
    } else if (accountTypeParam === "candidate") {
      setValue("accountType", "student", { shouldValidate: true });
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedFirstName = data.firstName?.trim() ?? "";
    const normalizedLastName = data.lastName?.trim() ?? "";
    const normalizedCompanyName = data.companyName?.trim() ?? "";
    const normalizedName =
      data.accountType === "company"
        ? normalizedCompanyName
        : `${normalizedFirstName} ${normalizedLastName}`.trim();

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: data.accountType.toUpperCase(),
        name: normalizedName,
        firstName: data.accountType === "company" ? undefined : normalizedFirstName,
        lastName: data.accountType === "company" ? undefined : normalizedLastName,
        email: normalizedEmail,
        password: data.password,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body?.error || "Failed to register");
      return;
    }

    // The account starts unverified, so no auto sign-in: the user has to
    // click the link we just emailed before they can log in. Registration
    // itself already sent that first email, so the resend cooldown starts
    // now too — otherwise a user could immediately hit "resend" and end up
    // with two emails, only the newer of which still has a working link.
    setRegisteredEmail(normalizedEmail);
    setResendCooldown(60);
  };

  const handleResend = async () => {
    if (!registeredEmail || resendStatus === "sending" || resendCooldown > 0) return;
    setResendStatus("sending");
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail }),
    }).catch(() => null);
    setResendStatus("sent");
    setResendCooldown(60);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);


  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand px-4 py-12">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-6 md:grid-cols-2">

          {/* Left: value prop panel — shown after the form on mobile so
              visitors hit the actual registration fields first */}
          <section className="order-2 rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-sm md:order-1 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
              COLAB Connects
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-white md:text-4xl">
              Create your account
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Join as a candidate to build a credible profile, or as a company to review talent
              and manage applicants in one workspace.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  ),
                  title: "Skill-first profiles",
                  desc: "Highlight what you can do, not just job titles.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <rect x="3" y="7" width="18" height="13" rx="2" />
                      <path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7" />
                    </svg>
                  ),
                  title: "Curated early-career roles",
                  desc: "Find internships and full-time roles built for growth.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                  title: "Clean company workspaces",
                  desc: "Review, save, and follow up without the mess.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-xs text-white/60">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-white underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </div>
          </section>

          {/* Right: form card — first on mobile, second at md: and up */}
          <section className="order-1 rounded-3xl border border-border bg-background p-7 shadow-xl md:order-2 md:p-8">
            {registeredEmail ? (
              <div>
                <h2 className="font-serif text-xl font-bold text-brand">Check your email</h2>
                <p className="mt-3 text-sm text-muted">
                  We sent a verification link to{" "}
                  <span className="font-semibold text-foreground">{registeredEmail}</span>.
                  Click it to activate your account, then log in. The link expires in 24 hours.
                </p>
                <p className="mt-3 text-sm text-muted">
                  Don&apos;t see it? Check your spam folder, or resend it below.
                </p>
                {resendStatus === "sent" ? (
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    Verification email sent. Use the link in the most recent email — each resend
                    replaces the previous link.
                  </p>
                ) : null}
                <Button
                  type="button"
                  onClick={handleResend}
                  isLoading={resendStatus === "sending"}
                  disabled={resendCooldown > 0}
                  className="btn-brand mt-4 w-full"
                >
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : "Resend verification email"}
                </Button>
                <p className="mt-4 text-center text-xs text-muted">
                  Already verified?{" "}
                  <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                    Log in
                  </Link>
                </p>
              </div>
            ) : (
            <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-brand">Register</h2>
                <p className="mt-1 text-sm text-muted">
                  It takes under a minute. You can edit your profile anytime.
                </p>
              </div>
              <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold text-brand">
                Secure
              </span>
            </div>

            {serverError ? (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* Account type */}
              <fieldset className="rounded-2xl border border-border bg-surface p-4">
                <legend className="px-1 text-sm font-semibold text-foreground">Account type</legend>
                <p className="mt-1 text-xs text-muted">
                  Choose candidate or company. You cannot change this later.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      accountType === "student"
                        ? "border-brand/40 bg-brand/5 ring-2 ring-brand/20"
                        : "border-border bg-background hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      value="student"
                      {...register("accountType")}
                      className="mt-1 h-4 w-4 accent-brand"
                      aria-describedby="account-type-student"
                    />
                    <span id="account-type-student">
                      <span className="font-semibold text-foreground">Candidate</span>
                      <span className="mt-1 block text-xs text-muted">
                        Build a profile and apply faster.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      accountType === "company"
                        ? "border-brand/40 bg-brand/5 ring-2 ring-brand/20"
                        : "border-border bg-background hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      value="company"
                      {...register("accountType")}
                      className="mt-1 h-4 w-4 accent-brand"
                      aria-describedby="account-type-company"
                    />
                    <span id="account-type-company">
                      <span className="font-semibold text-foreground">Company</span>
                      <span className="mt-1 block text-xs text-muted">
                        Post roles and review applicants.
                      </span>
                    </span>
                  </label>
                </div>

                {errors.accountType ? (
                  <p className="mt-2 text-xs text-red-600">{errors.accountType.message}</p>
                ) : null}
              </fieldset>

              {accountType === "company" ? (
                <Input
                  label="Company name"
                  type="text"
                  autoComplete="organization"
                  placeholder="Your company name"
                  required
                  minLength={2}
                  {...register("companyName")}
                  error={errors.companyName?.message}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="First name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    required
                    minLength={2}
                    {...register("firstName")}
                    error={errors.firstName?.message}
                  />
                  <Input
                    label="Last name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    required
                    minLength={2}
                    {...register("lastName")}
                    error={errors.lastName?.message}
                  />
                </div>
              )}

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
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("password")}
                error={errors.password?.message}
                rightSection={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-muted hover:text-foreground transition"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.39 1 12a10.94 10.94 0 0 1 2.06-3.94M9.9 4.24A9.12 9.12 0 0 1 12 4c5 0 9.27 3.61 11 8a10.94 10.94 0 0 1-1.27 2.43" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M1 12C2.73 7.61 7 4 12 4s9.27 3.61 11 8c-1.73 4.39-6 8-11 8S2.73 16.39 1 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                }
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="btn-brand w-full"
              >
                Create account
              </Button>

              <p className="text-center text-xs text-muted">
                By creating an account, you agree to our{" "}
                <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
            </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
