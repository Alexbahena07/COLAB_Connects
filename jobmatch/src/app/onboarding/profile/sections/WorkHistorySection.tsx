"use client";

import { useState } from "react";
import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import Input from "@/components/ui/Input";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
};

export function WorkHistorySection({ control, register, setValue }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "experiences" });
  const [currentJobs, setCurrentJobs] = useState<Record<number, boolean>>({});

  const toggleCurrent = (i: number) => {
    const next = !currentJobs[i];
    setCurrentJobs((prev) => ({ ...prev, [i]: next }));
    if (next) setValue(`experiences.${i}.endDate`, "");
  };

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Work history</h2>
          <p className="mt-1 text-sm text-muted">Highlight internships, projects, and roles.</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={() => append({ title: "", company: "", startDate: "", endDate: "", description: "" })}
        >
          Add role
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
            No roles yet. Add your most relevant experience first.
          </div>
        ) : null}

        {fields.map((f, i) => {
          const isCurrent = Boolean(currentJobs[i]);
          return (
            <div key={f.id} className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Title"
                  labelClassName="text-foreground"
                  className="border-border bg-background text-foreground placeholder:text-muted"
                  {...register(`experiences.${i}.title`)}
                />
                <Input
                  label="Company"
                  labelClassName="text-foreground"
                  className="border-border bg-background text-foreground placeholder:text-muted"
                  {...register(`experiences.${i}.company`)}
                />
                <Input
                  label="Start"
                  type="month"
                  labelClassName="text-foreground"
                  className="border-border bg-background text-foreground"
                  {...register(`experiences.${i}.startDate`)}
                />
                <div className="flex flex-col gap-1">
                  <Input
                    label="End"
                    type="month"
                    labelClassName={isCurrent ? "text-muted" : "text-foreground"}
                    className={`border-border bg-background text-foreground ${isCurrent ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={isCurrent}
                    {...register(`experiences.${i}.endDate`)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCurrent(i)}
                    className={`inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isCurrent
                        ? "bg-brandBlue/10 text-brandBlue"
                        : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
                    }`}
                  >
                    <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${isCurrent ? "border-brandBlue bg-brandBlue" : "border-muted"}`}>
                      {isCurrent && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2 w-2" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    Still working here
                  </button>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label
                    htmlFor={`experience-description-${i}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Description
                  </label>
                  <textarea
                    id={`experience-description-${i}`}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-2 focus:ring-foreground/15"
                    {...register(`experiences.${i}.description`)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                    onClick={() => {
                      remove(i);
                      setCurrentJobs((prev) => {
                        const next = { ...prev };
                        delete next[i];
                        return next;
                      });
                    }}
                  >
                    Remove role
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
