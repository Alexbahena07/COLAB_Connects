"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import Input from "@/components/ui/Input";
import type { FormData } from "../schema";

type Props = {
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
};

export function CertificatesSection({ control, register }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "certificates" });

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Certificates</h2>
          <p className="mt-1 text-sm text-muted">Add credentials that strengthen your story.</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={() => append({ name: "", issuer: "", issuedAt: "", credentialId: "", credentialUrl: "" })}
        >
          Add certificate
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
            No certificates yet. Add one if it&apos;s relevant (Bloomberg, CPA track, Coursera, etc.).
          </div>
        ) : null}

        {fields.map((f, i) => (
          <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Name"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`certificates.${i}.name`)}
              />
              <Input
                label="Issuer"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`certificates.${i}.issuer`)}
              />
              <Input
                label="Issued"
                type="date"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground"
                {...register(`certificates.${i}.issuedAt`)}
              />
              <Input
                label="Cred. ID"
                labelClassName="text-foreground"
                className="border-border bg-background text-foreground placeholder:text-muted"
                {...register(`certificates.${i}.credentialId`)}
              />
              <Input
                label="URL"
                type="url"
                labelClassName="text-foreground"
                className="col-span-2 border-border bg-background text-foreground placeholder:text-muted"
                {...register(`certificates.${i}.credentialUrl`)}
              />
              <div className="col-span-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                  onClick={() => remove(i)}
                >
                  Remove certificate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
