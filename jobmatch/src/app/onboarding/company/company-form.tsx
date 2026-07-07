"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";

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

type Props = { onSuccess: () => void };

export default function CompanyProfileForm({ onSuccess }: Props) {
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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
    router.refresh();
    onSuccess();
  };

  return (
    <form id="company-profile-form" className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {loadError ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Company details</h2>
          <p className="mt-1 text-sm text-muted">Basic info employers and scholars will see on your profile.</p>
        </div>

        <div className="mt-5 space-y-4">
          <Input
            label="Company name"
            placeholder="Acme Labs"
            autoComplete="organization"
            labelClassName="text-foreground"
            className="border-border bg-background text-foreground placeholder:text-muted"
            {...register("companyName")}
            error={errors.companyName?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Website"
              type="url"
              placeholder="https://acme.com"
              labelClassName="text-foreground"
              className="border-border bg-background text-foreground placeholder:text-muted"
              {...register("website")}
              error={errors.website?.message}
            />
            <Input
              label="Headquarters"
              placeholder="City, State"
              labelClassName="text-foreground"
              className="border-border bg-background text-foreground placeholder:text-muted"
              {...register("headquarters")}
              error={errors.headquarters?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">About</h2>
          <p className="mt-1 text-sm text-muted">Share your mission and what scholars can expect.</p>
        </div>
        <div className="mt-5">
          <textarea
            id="company-about"
            rows={5}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand"
            placeholder="Share a quick overview, mission, and what students can expect."
            {...register("about")}
          />
          {errors.about ? <p className="mt-1 text-xs text-red-600">{errors.about.message}</p> : null}
        </div>
      </section>
    </form>
  );
}
