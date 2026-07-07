"use client";

import { type ChangeEvent, type RefObject } from "react";
import { Controller, type Control, type UseFormRegister } from "react-hook-form";
import Input from "@/components/ui/Input";
import Autocomplete from "@/components/ui/Autocomplete";
import { CITY_OPTIONS } from "../options";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
  isEmbedded: boolean;
  formDisabled: boolean;
  avatarUrl: string | null;
  avatarError: string | null;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function BasicInfoSection({
  control,
  register,
  isEmbedded,
  formDisabled,
  avatarUrl,
  avatarError,
  avatarInputRef,
  onAvatarChange,
}: Props) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Basic info</h2>
          <p className="mt-1 text-sm text-muted">Add a headline, location, and a professional photo.</p>
        </div>
      </div>

      <div className={`mt-6 grid gap-6 ${isEmbedded ? "" : "lg:grid-cols-[360px_1fr]"}`}>
        {/* Avatar card */}
        <div className="rounded-3xl border border-white/10 bg-brand p-5 ring-1 ring-white/10">
          <div>
            <p className="text-sm font-semibold text-white">Profile photo</p>
            <p className="mt-1 text-xs text-white/70">Upload a photo and crop it to look your best.</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/5 shadow-sm ring-2 ring-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                  No photo
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Edit photo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="text-[10px] font-semibold text-white">Edit photo</span>
              </label>
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brandBlue px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                Choose photo
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={avatarInputRef}
                onChange={onAvatarChange}
                disabled={formDisabled}
              />
              <p className="text-xs text-white/60">JPG or PNG · max 2 MB</p>
              {avatarError ? <p className="text-xs text-red-400">{avatarError}</p> : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
            We recommend a clean headshot with good lighting.
          </div>
        </div>

        {/* Profile fields */}
        <div className="rounded-3xl border border-border bg-surface p-5 ring-1 ring-black/5">
          <div className={`grid gap-4 ${isEmbedded ? "grid-cols-2" : "md:grid-cols-3"}`}>
            <Input
              label="First name"
              labelClassName="text-foreground"
              className="border-border bg-background text-foreground placeholder:text-muted"
              {...register("profile.firstName")}
            />
            <Input
              label="Last name"
              labelClassName="text-foreground"
              className="border-border bg-background text-foreground placeholder:text-muted"
              {...register("profile.lastName")}
            />
            <Input
              label="Headline"
              placeholder="e.g., Financial Analyst • FP&A • SQL"
              labelClassName="text-foreground"
              className={`border-border bg-background text-foreground placeholder:text-muted ${isEmbedded ? "col-span-2" : ""}`}
              {...register("profile.headline")}
            />
            <div className={isEmbedded ? "col-span-2" : "md:col-span-3"}>
              <Controller
                control={control}
                name="profile.desiredLocation"
                render={({ field }) => (
                  <Autocomplete
                    label="Desired work location"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Start typing a city"
                    options={CITY_OPTIONS}
                    labelClassName="text-foreground"
                    inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                    panelClassName="border-border bg-surface"
                    optionClassName="text-foreground hover:bg-surface"
                  />
                )}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-brandBlue/20 bg-brandBlue/5 px-4 py-3 text-xs text-foreground/70">
            Your headline is what recruiters scan first—lead with role + tools (ex: "Analyst • Excel • SQL").
          </div>
        </div>
      </div>
    </section>
  );
}
