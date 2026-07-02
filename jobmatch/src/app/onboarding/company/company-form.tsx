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

  const exitEditMode = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("profile-editing");
    document.getElementById("profile-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    setSaveMessage("Changes saved!");
    router.refresh();
    setTimeout(exitEditMode, 600);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {loadError ? (
        <div className="rounded-lg border border-red-400 bg-red-500/5 px-3 py-2 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}
      {saveMessage ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-400 bg-green-500/5 px-3 py-2 text-sm text-green-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
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
          <label className="block text-sm font-medium text-foreground" htmlFor="company-team-size">
            Company size
          </label>
          <select
            id="company-team-size"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
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
          <label className="block text-sm font-medium text-foreground" htmlFor="company-industry">
            Industry
          </label>
          <input
            id="company-industry"
            list="industry-options"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
            placeholder="Select or type an industry"
            {...register("hiringFocus")}
          />
          <datalist id="industry-options">
            <option value="Accounting" />
            <option value="Corporate Finance" />
            <option value="Hedge Funds" />
            <option value="Investment Banking" />
            <option value="Management Consulting" />
            <option value="Private Credit" />
            <option value="Private Equity" />
            <option value="Real Estate/Real Assets" />
            <option value="Start-ups" />
            <option value="Venture Capital" />
          </datalist>
          {errors.hiringFocus ? (
            <p className="text-xs text-red-600">{errors.hiringFocus.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground" htmlFor="company-about">
          About your company
        </label>
        <textarea
          id="company-about"
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand"
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
