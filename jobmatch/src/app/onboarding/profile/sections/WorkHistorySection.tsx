"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import Input from "@/components/ui/Input";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
};

export function WorkHistorySection({ control, register }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "experiences" });

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
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

        {fields.map((f, i) => (
          <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
            <div className="grid grid-cols-2 gap-3">
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
                type="date"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground"
                {...register(`experiences.${i}.startDate`)}
              />
              <Input
                label="End"
                type="date"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground"
                {...register(`experiences.${i}.endDate`)}
              />
              <Input
                label="Description"
                labelClassName="text-foreground"
                className="col-span-2 border-border bg-background text-foreground placeholder:text-muted"
                {...register(`experiences.${i}.description`)}
              />
              <div className="col-span-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                  onClick={() => remove(i)}
                >
                  Remove role
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
