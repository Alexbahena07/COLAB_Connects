"use client";

import { Controller, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import Input from "@/components/ui/Input";
import Autocomplete from "@/components/ui/Autocomplete";
import { SCHOOL_OPTIONS } from "../options";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
};

export function DegreesSection({ control, register }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "degrees" });

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Degrees</h2>
          <p className="mt-1 text-sm text-muted">Add education history. Keep it clean and scannable.</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={() => append({ school: "", degree: "", field: "", startDate: "", endDate: "" })}
        >
          Add degree
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
            No degrees yet. Add one to help employers understand your background.
          </div>
        ) : null}

        {fields.map((f, i) => (
          <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Controller
                  control={control}
                  name={`degrees.${i}.school`}
                  render={({ field }) => (
                    <Autocomplete
                      label="School"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Start typing a school…"
                      options={SCHOOL_OPTIONS}
                      labelClassName="text-foreground"
                      inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                      panelClassName="border-border bg-surface"
                      optionClassName="text-foreground hover:bg-surface"
                    />
                  )}
                />
              </div>
              <Input
                label="Degree"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`degrees.${i}.degree`)}
              />
              <Input
                label="Field"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`degrees.${i}.field`)}
              />
              <Input
                label="Start"
                type="date"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground"
                {...register(`degrees.${i}.startDate`)}
              />
              <Input
                label="End"
                type="date"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground"
                {...register(`degrees.${i}.endDate`)}
              />
              <div className="col-span-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                  onClick={() => remove(i)}
                >
                  Remove degree
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
