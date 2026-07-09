"use client";

import { Controller, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import Input from "@/components/ui/Input";
import Autocomplete from "@/components/ui/Autocomplete";
import { SKILL_OPTIONS } from "../options";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
};

const MAX_SKILLS = 10;

export function SkillsSection({ control, register }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "skills" });
  const atLimit = fields.length >= MAX_SKILLS;

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Skills</h2>
          <p className="mt-1 text-sm text-muted">
            Add skills and (optionally) years of experience. {fields.length}/{MAX_SKILLS} used.
          </p>
        </div>
        <button
          type="button"
          disabled={atLimit}
          className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => append({ name: "", years: undefined })}
        >
          Add skill
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
            No skills yet. Add 8–10 relevant skills to start.
          </div>
        ) : null}

        {atLimit ? (
          <p className="text-xs font-medium text-brandBlue">
            You've reached the 10 skill limit. Remove one to add another.
          </p>
        ) : null}

        {fields.map((f, i) => (
          <div key={f.id} className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Controller
                control={control}
                name={`skills.${i}.name`}
                render={({ field }) => (
                  <Autocomplete
                    label="Skill"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Start typing a skill…"
                    options={SKILL_OPTIONS}
                    labelClassName="text-foreground"
                    inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                    panelClassName="border-border bg-surface"
                    optionClassName="text-foreground hover:bg-surface"
                  />
                )}
              />
              <Input
                label="Years"
                type="number"
                min={0}
                max={50}
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`skills.${i}.years`)}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-border/40"
                  onClick={() => remove(i)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
