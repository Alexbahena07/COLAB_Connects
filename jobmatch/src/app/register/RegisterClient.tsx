"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

const RegisterSchema = z.object({
  accountType: z.enum(["student", "company"], {
    required_error: "Select an account type",
  }),
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  profilePhoto: z
    .any()
    .refine((value) => {
      if (typeof FileList === "undefined") return true;
      return value instanceof FileList && value.length > 0;
    }, "Upload a profile photo")
    .refine((value) => {
      if (typeof FileList === "undefined" || !(value instanceof FileList) || value.length === 0) return true;
      const file = value.item(0);
      return !!file && file.type.startsWith("image/");
    }, "Upload an image file")
    .refine((value) => {
      if (typeof FileList === "undefined" || !(value instanceof FileList) || value.length === 0) return true;
      const file = value.item(0);
      return !!file && file.size <= 4 * 1024 * 1024;
    }, "Image must be 4MB or smaller"),
});
type RegisterFormData = z.infer<typeof RegisterSchema>;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function RegisterPage() {
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
      defaultValues: { accountType: "student" },
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
    const normalizedName = data.name.trim();

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

    // 2) Immediately sign them in with the same credentials
    const signin = await signIn("credentials", {
      email: normalizedEmail,
      password: data.password,
      redirect: false, // we'll route manually
    });

    if (signin && !signin.error) {
      const nextRoute =
        data.accountType === "company" ? "/dashboard/company/candidates" : "/onboarding/profile";
      router.push(nextRoute);
    } else {
      // If auto-login fails (should be rare), fall back to login page
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
      <main className="min-h-screen grid place-items-center bg-[var(--brand)] px-4">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Create an account</h1>
        <p className="text-sm text-gray-600 mb-6">Register below to continue</p>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--foreground)]">Account type</legend>
            <p className="mt-1 text-xs text-gray-600">Tell us whether you&apos;re joining as a candidate or on behalf of a company.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-[var(--surface)] p-3 text-sm transition hover:border-[var(--brandBlue)] ${accountType === "student" ? "border-[var(--brandBlue)] ring-2 ring-[var(--brandBlue)]" : "border-[var(--border)] ring-0"}`}
              >
                <input
                  type="radio"
                  value="student"
                  {...register("accountType")}
                  className="mt-1 h-4 w-4"
                  aria-describedby="account-type-student"
                />
                <span id="account-type-student">
                  <span className="font-semibold text-[var(--foreground)]">Candidate</span>
                  <span className="mt-1 block text-xs text-gray-600">Personalized profile builder and job-matching tools.</span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-[var(--surface)] p-3 text-sm transition hover:border-[var(--brandBlue)] ${accountType === "company" ? "border-[var(--brandBlue)] ring-2 ring-[var(--brandBlue)]" : "border-[var(--border)] ring-0"}`}
              >
                <input
                  type="radio"
                  value="company"
                  {...register("accountType")}
                  className="mt-1 h-4 w-4"
                  aria-describedby="account-type-company"
                />
                <span id="account-type-company">
                  <span className="font-semibold text-[var(--foreground)]">Company</span>
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

  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700" htmlFor="profile-photo-input">
      Profile photo
    </label>
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
              <label
                htmlFor="profile-photo-input"
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-transparent bg-[var(--background)]/10 px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--background)]/20"
              >
                <span>Upload image</span>
                <span className="text-xs font-normal text-[var(--foreground)]/60">PNG or JPG up to 4MB</span>
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
                    className="h-16 w-16 rounded-full border border-[var(--border)] object-cover shadow-sm"
                  />
                  <span className="text-xs text-gray-600">Looks great! You can swap this out by uploading a different file.</span>
                </div>
              ) : (
                <p className="text-xs text-gray-600">This will represent you across the platform.</p>
              )}
            </div>
    {errors.profilePhoto ? (
      <p className="text-xs text-red-600">{errors.profilePhoto.message as string}</p>
    ) : null}
  </div>

  {accountType === "student" ? (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Import from LinkedIn</h2>
      <p className="mt-1 text-xs text-gray-600">
        Connect LinkedIn to import internships, jobs, and certifications directly into your profile. You&apos;ll get
        a preview before anything is saved.
      </p>
      <Button
        type="button"
        className="mt-3 bg-[var(--brand)] text-white hover:opacity-90"
        onClick={handleLinkedInConnect}
      >
        Connect LinkedIn
      </Button>
    </div>
  ) : null}

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          <Button type="submit" isLoading={isSubmitting} className="bg-[var(--brand)] text-white">
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
    </>
  );
}
