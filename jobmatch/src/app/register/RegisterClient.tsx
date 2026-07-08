"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
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
    profilePhoto: z
      .any()
      .refine((value) => {
        if (typeof FileList === "undefined") return true;
        return value instanceof FileList && value.length > 0;
      }, "Upload a profile photo")
      .refine((value) => {
        if (
          typeof FileList === "undefined" ||
          !(value instanceof FileList) ||
          value.length === 0
        )
          return true;
        const file = value.item(0);
        return !!file && file.type.startsWith("image/");
      }, "Upload an image file")
      .refine((value) => {
        if (
          typeof FileList === "undefined" ||
          !(value instanceof FileList) ||
          value.length === 0
        )
          return true;
        const file = value.item(0);
        return !!file && file.size <= 4 * 1024 * 1024;
      }, "Image must be 4MB or smaller"),
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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
  const selectedPhoto = watch("profilePhoto") as FileList | undefined;

  useEffect(() => {
    const accountTypeParam = searchParams?.get("type");
    if (accountTypeParam === "company") {
      setValue("accountType", "company", { shouldValidate: true });
    } else if (accountTypeParam === "candidate") {
      setValue("accountType", "student", { shouldValidate: true });
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    if (!selectedPhoto || selectedPhoto.length === 0) {
      setPhotoPreview(null);
      return undefined;
    }
    const file = selectedPhoto.item(0);
    if (!file) {
      setPhotoPreview(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    const photoFile =
      typeof FileList === "undefined" || !(data.profilePhoto instanceof FileList)
        ? null
        : data.profilePhoto.item(0);

    if (!photoFile) {
      setServerError("Please upload a profile photo to continue.");
      return;
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedFirstName = data.firstName?.trim() ?? "";
    const normalizedLastName = data.lastName?.trim() ?? "";
    const normalizedCompanyName = data.companyName?.trim() ?? "";
    const normalizedName =
      data.accountType === "company"
        ? normalizedCompanyName
        : `${normalizedFirstName} ${normalizedLastName}`.trim();

    let encodedPhoto: string;
    try {
      encodedPhoto = await fileToDataUrl(photoFile);
    } catch {
      setServerError("We couldn't read that image. Try a different file.");
      return;
    }

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
        profilePhoto: encodedPhoto,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body?.error || "Failed to register");
      return;
    }

    const signin = await signIn("credentials", {
      email: normalizedEmail,
      password: data.password,
      redirect: false,
    });

    if (signin && !signin.error) {
      const nextRoute =
        data.accountType === "company"
          ? "/dashboard/company/candidates"
          : "/onboarding/profile";
      router.push(nextRoute);
    } else {
      setServerError("Account created, but sign-in failed. Please log in.");
      router.push("/login");
    }
  };


  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand px-4 py-12">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-6 md:grid-cols-2">

          {/* Left: value prop panel */}
          <section className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-sm md:p-8">
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

          {/* Right: form card */}
          <section className="rounded-3xl border border-border bg-background p-7 shadow-xl md:p-8">
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

              {/* Photo upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground" htmlFor="profile-photo-input">
                  Profile photo
                </label>

                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-4">
                  <label
                    htmlFor="profile-photo-input"
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
                  >
                    <span>Upload image</span>
                    <span className="text-xs font-normal text-muted">PNG / JPG up to 4 MB</span>
                  </label>

                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    {...register("profilePhoto")}
                  />

                  {photoPreview ? (
                    <div className="flex items-center gap-3">
                      <Image
                        src={photoPreview}
                        alt="Profile preview"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full border border-border object-cover shadow-sm"
                      />
                      <span className="text-xs text-muted">
                        Looking good — upload again to change it.
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      This will appear on your profile and applications.
                    </p>
                  )}
                </div>

                {errors.profilePhoto ? (
                  <p className="text-xs text-red-600">{errors.profilePhoto.message as string}</p>
                ) : null}
              </div>


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
          </section>
        </div>
      </main>
    </>
  );
}
