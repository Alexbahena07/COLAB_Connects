"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const STORAGE_KEY = "company-profile";

const CompanyProfileSchema = z.object({
  companyName: z.string().min(2, "Enter your company name"),
  website: z
    .string()
    .url("Enter a valid URL")
    .or(z.literal(""))
    .optional(),
  headquarters: z.string().optional(),
  teamSize: z.string().optional(),
  hiringFocus: z.string().optional(),
  about: z.string().max(800, "Keep it under 800 characters").optional(),
});

type CompanyProfileFormData = z.infer<typeof CompanyProfileSchema>;

export default function CompanyProfileForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(CompanyProfileSchema),
    defaultValues: {
      companyName: "",
      website: "",
      headquarters: "",
      teamSize: "",
      hiringFocus: "",
      about: "",
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      reset({
        companyName: parsed.companyName ?? "",
        website: parsed.website ?? "",
        headquarters: parsed.headquarters ?? "",
        teamSize: parsed.teamSize ?? "",
        hiringFocus: parsed.hiringFocus ?? "",
        about: parsed.about ?? "",
      });
    } catch (error) {
      console.error("Failed to load saved company profile", error);
    }
  }, [reset]);

  const onSubmit = async (values: CompanyProfileFormData) => {
    // Placeholder submit - plug into API when ready
    console.log("Company onboarding submission", values);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    router.push("/dashboard/company");
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Company name"
        placeholder="Acme Labs"
        autoComplete="organization"
        {...register("companyName")}
        error={errors.companyName?.message}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Website"
          type="url"
          placeholder="https://acme.com"
          {...register("website")}
          error={errors.website?.message}
        />
        <Input
          label="Headquarters"
          placeholder="City, Country"
          {...register("headquarters")}
          error={errors.headquarters?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="company-team-size">
            Team size
          </label>
          <select
            id="company-team-size"
            className="h-11 w-full rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
            {...register("teamSize")}
          >
            <option value="">Select size</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
          {errors.teamSize ? (
            <p className="text-xs text-red-600">{errors.teamSize.message}</p>
          ) : null}
        </div>

        <Input
          label="Hiring focus"
          placeholder="e.g. Product design interns"
          {...register("hiringFocus")}
          error={errors.hiringFocus?.message}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700" htmlFor="company-about">
          About your company
        </label>
        <textarea
          id="company-about"
          rows={5}
          className="w-full rounded-xl border border-[--border] bg-[--surface] px-3 py-2 text-sm text-[--foreground]"
          placeholder="Share a quick overview, mission, and what students can expect."
          {...register("about")}
        />
        {errors.about ? <p className="text-xs text-red-600">{errors.about.message}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isSubmitting} className="btn-brand">
          Save &amp; continue
        </Button>
        <Button
          type="button"
          className="btn-outline-brand"
          onClick={() => router.push("/dashboard/company")}
        >
          Skip for now
        </Button>
      </div>
    </form>
  );
}
