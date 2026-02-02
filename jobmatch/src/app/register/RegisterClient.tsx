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
        accountType: data.accountType,
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

  const handleLinkedInConnect = () => {
    if (typeof window === "undefined") return;
    const callbackUrl = `${window.location.origin}/onboarding/import`;
    void signIn("linkedin", { callbackUrl });
  };

  return (
    <>
      <Header />

      {/* Background that matches your hero: soft gradient + subtle blobs */}
      <main className="relative min-h-screen overflow-hidden bg-background px-4 py-12 text-foreground">
        <div className="absolute inset-0 bg-linear-to-br from-brand via-background to-brandBlue opacity-60" />
        <div className="absolute -left-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-5xl items-start gap-8 md:grid-cols-2">
          {/* Left: value prop panel (keeps it cohesive with homepage) */}
          <section className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--foreground)/70">
              COLAB Connects
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Create your account
            </h1>
            <p className="mt-3 text-sm text-(--foreground)/85">
              Join as a candidate to build a credible profile, or as a company to review talent
              and manage applicants in one workspace.
            </p>

            <div className="mt-6 space-y-3">
              {[
                { title: "Skill-first profiles", desc: "Highlight what you can do — not just job titles." },
                { title: "Curated early-career roles", desc: "Find internships and full-time roles built for growth." },
                { title: "Clean company workspaces", desc: "Review, save, and follow up without the mess." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-(--foreground)/75">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-(--foreground)/70">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                Log in
              </Link>
            </p>
          </section>

          {/* Right: the form card (more premium, better contrast, consistent tokens) */}
          <section className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground">Register</h2>
                <p className="mt-1 text-sm text-(--foreground)/75">
                  It takes under a minute. You can edit your profile anytime.
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-(--foreground)/80">
                Secure
              </span>
            </div>

            {serverError ? (
              <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">
                {serverError}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Account type */}
              <fieldset className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <legend className="px-1 text-sm font-semibold text-foreground">Account type</legend>
                <p className="mt-1 text-xs text-(--foreground)/70">
                  Choose candidate or company. You can’t change this later.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      accountType === "student"
                        ? "border-white/25 bg-white/10 ring-2 ring-white/15"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      value="student"
                      {...register("accountType")}
                      className="mt-1 h-4 w-4 accent-white"
                      aria-describedby="account-type-student"
                    />
                    <span id="account-type-student">
                      <span className="font-semibold text-foreground">Candidate</span>
                      <span className="mt-1 block text-xs text-(--foreground)/70">
                        Build a profile and apply faster.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      accountType === "company"
                        ? "border-white/25 bg-white/10 ring-2 ring-white/15"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      value="company"
                      {...register("accountType")}
                      className="mt-1 h-4 w-4 accent-white"
                      aria-describedby="account-type-company"
                    />
                    <span id="account-type-company">
                      <span className="font-semibold text-foreground">Company</span>
                      <span className="mt-1 block text-xs text-(--foreground)/70">
                        Post roles and review applicants.
                      </span>
                    </span>
                  </label>
                </div>

                {errors.accountType ? (
                  <p className="mt-2 text-xs text-red-200">{errors.accountType.message}</p>
                ) : null}
              </fieldset>

              {/* Inputs: use your component, but keep the surrounding text on-brand */}
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
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("password")}
                error={errors.password?.message}
              />

              {/* Photo upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground" htmlFor="profile-photo-input">
                  Profile photo
                </label>

                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
                  <label
                    htmlFor="profile-photo-input"
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white/15"
                  >
                    <span>Upload image</span>
                    <span className="text-xs font-normal text-(--foreground)/70">PNG/JPG up to 4MB</span>
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
                        className="h-16 w-16 rounded-full border border-white/15 object-cover shadow-sm"
                      />
                      <span className="text-xs text-(--foreground)/70">
                        Looking good — upload again if you want to change it.
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-(--foreground)/70">
                      This will appear on your profile and applications.
                    </p>
                  )}
                </div>

                {errors.profilePhoto ? (
                  <p className="text-xs text-red-200">{errors.profilePhoto.message as string}</p>
                ) : null}
              </div>

              {/* LinkedIn */}
              {accountType === "student" ? (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Import from LinkedIn</h3>
                  <p className="mt-1 text-xs text-(--foreground)/70">
                    Import internships, jobs, and certifications. You’ll preview before saving.
                  </p>
                  <Button
                    type="button"
                    className="mt-3 border border-white/15 bg-white/10 text-foreground hover:bg-white/15"
                    onClick={handleLinkedInConnect}
                  >
                    Connect LinkedIn
                  </Button>
                </div>
              ) : null}

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full border border-white/15 bg-white text-brand hover:opacity-95"
              >
                Create account
              </Button>

              <p className="text-center text-xs text-(--foreground)/70">
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
