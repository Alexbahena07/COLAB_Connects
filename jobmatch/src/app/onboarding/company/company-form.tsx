"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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
    let active = true;
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/companies/profile", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) {
          setLoadError(
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load your company profile."
          );
          return;
        }
        const profile = payload?.profile ?? {};
        reset({
          companyName: profile.companyName ?? "",
          website: profile.website ?? "",
          headquarters: profile.headquarters ?? "",
          teamSize: profile.teamSize ?? "",
          hiringFocus: profile.industry ?? "",
          about: profile.bio ?? "",
        });
        setLoadError(null);
      } catch (error) {
        console.error("Failed to load company profile", error);
        if (!active) return;
        setLoadError("We couldn't load your company profile.");
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [reset]);

  const onSubmit = async (values: CompanyProfileFormData) => {
    setLoadError(null);
    setSaveMessage(null);
    const response = await fetch("/api/companies/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: values.companyName,
        website: values.website,
        headquarters: values.headquarters,
        teamSize: values.teamSize,
        industry: values.hiringFocus,
        bio: values.about,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setLoadError(
        typeof payload?.error === "string"
          ? payload.error
          : "We couldn't save your company profile."
      );
      return;
    }
    setSaveMessage("Company profile saved.");
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {loadError ? (
        <div className="rounded-lg border border-red-400 bg-red-500/5 px-3 py-2 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}
      {saveMessage ? (
        <div className="rounded-lg border border-green-400 bg-green-500/5 px-3 py-2 text-sm text-green-600">
          {saveMessage}
        </div>
      ) : null}
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
          placeholder="City, State"
          {...register("headquarters")}
          error={errors.headquarters?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[--foreground]" htmlFor="company-team-size">
            Company size
          </label>
          <select
            id="company-team-size"
            className="h-11 w-full rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
            {...register("teamSize")}
          >
            <option value="" className="bg-white text-black">Select size</option>
            <option value="1-10" className="bg-white text-black">1-10</option>
            <option value="11-50" className="bg-white text-black">11-50</option>
            <option value="51-200" className="bg-white text-black">51-200</option>
            <option value="201-500" className="bg-white text-black">201-500</option>
            <option value="500+" className="bg-white text-black">500+</option>
          </select>
          {errors.teamSize ? (
            <p className="text-xs text-red-600">{errors.teamSize.message}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-[--foreground]" htmlFor="company-industry">
            Industry
          </label>
          <select
            id="company-industry"
            className="h-11 w-full rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
            {...register("hiringFocus")}
          >
            <option value="" className="bg-white text-black">Select industry</option>
            <option value="Accounting" className="bg-white text-black">Accounting</option>
            <option value="Corporate Finance" className="bg-white text-black">Corporate Finance</option>
            <option value="Hedge Funds" className="bg-white text-black">Hedge Funds</option>
            <option value="Investment Banking" className="bg-white text-black">Investment Banking</option>
            <option value="Management Consulting" className="bg-white text-black">Management Consulting</option>
            <option value="Private Credit" className="bg-white text-black">Private Credit</option>
            <option value="Private Equity" className="bg-white text-black">Private Equity</option>
            <option value="Real Estate/Real Assets" className="bg-white text-black">Real Estate/Real Assets</option>
            <option value="Start-ups" className="bg-white text-black">Start-ups</option>
            <option value="Venture Capital" className="bg-white text-black">Venture Capital</option>
          </select>
          {errors.hiringFocus ? (
            <p className="text-xs text-red-600">{errors.hiringFocus.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-[--foreground]" htmlFor="company-about">
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
          Save
        </Button>
      </div>
    </form>
  );
}
