"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import type {
  LinkedInPreviewPayload,
  LinkedInExperiencePreview,
  LinkedInCertificationPreview,
} from "@/types/linkedin";

type FetchState = {
  loading: boolean;
  error: string | null;
  data: LinkedInPreviewPayload | null;
};

export default function LinkedInImportClient() {
  const [state, setState] = useState<FetchState>({
    loading: true,
    error: null,
    data: null,
  });
  const [selectedExperiences, setSelectedExperiences] = useState<Set<string>>(new Set());
  const [selectedCertifications, setSelectedCertifications] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPreview = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch("/api/linkedin/import/preview", { cache: "no-store" });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Unable to load LinkedIn data.");
        }
        const payload: LinkedInPreviewPayload = await response.json();
        if (!mounted) return;
        setState({ loading: false, error: null, data: payload });
        setSelectedExperiences(new Set(payload.experiences.map((item) => item.id)));
        setSelectedCertifications(new Set(payload.certifications.map((item) => item.id)));
      } catch (error) {
        if (!mounted) return;
        setState({
          loading: false,
          error: (error as Error).message || "Failed to load LinkedIn data.",
          data: null,
        });
      }
    };

    loadPreview();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleExperience = (id: string) => {
    setSelectedExperiences((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCertification = (id: string) => {
    setSelectedCertifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasSelection = useMemo(() => {
    return selectedExperiences.size > 0 || selectedCertifications.size > 0;
  }, [selectedExperiences, selectedCertifications]);

  const handleSave = async () => {
    setSuccessMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/linkedin/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceIds: Array.from(selectedExperiences),
          certificationIds: Array.from(selectedCertifications),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save LinkedIn data.");
      }
      const body = await response.json().catch(() => ({}));
      setSuccessMessage(
        `Imported ${body.experiences ?? 0} experiences and ${body.certifications ?? 0} certifications.`
      );
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || "Failed to save LinkedIn data.",
      }));
    } finally {
      setSaving(false);
    }
  };

  if (state.loading) {
    return (
      <div className="rounded-3xl border border-[--border] bg-[--surface] p-6 text-sm opacity-80">
        Loading your LinkedIn data...
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {state.error} Try reconnecting your LinkedIn account from the registration page.
      </div>
    );
  }

  const experiences = state.data?.experiences ?? [];
  const certifications = state.data?.certifications ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[--brand]">Experiences</h2>
            <p className="text-sm opacity-70">Select which roles to import.</p>
          </div>
          <Button
            type="button"
            className="border border-[--border] bg-[--surface] text-[--brand]"
            onClick={() => {
              const ids = experiences.map((exp) => exp.id);
              const currentlyAllSelected = ids.every((id) => selectedExperiences.has(id));
              setSelectedExperiences(currentlyAllSelected ? new Set() : new Set(ids));
            }}
          >
            {experiences.every((exp) => selectedExperiences.has(exp.id)) ? "Deselect all" : "Select all"}
          </Button>
        </header>

        {experiences.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">
            LinkedIn did not return any experience data. You can add roles manually later.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {experiences.map((exp) => (
              <li
                key={exp.id}
                className="rounded-2xl border border-[--border] bg-white/60 p-4 shadow-sm"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedExperiences.has(exp.id)}
                    onChange={() => toggleExperience(exp.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-lg font-semibold text-[--brand]">{exp.title}</p>
                    <p className="text-sm opacity-80">{exp.company}</p>
                    <p className="text-xs uppercase tracking-wide opacity-60">
                      {formatSpan(exp.startDate, exp.endDate)}
                    </p>
                    {exp.description ? (
                      <p className="mt-2 text-sm opacity-80">{exp.description}</p>
                    ) : null}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[--brand]">Certifications</h2>
            <p className="text-sm opacity-70">Keep proof of credentials up to date.</p>
          </div>
          <Button
            type="button"
            className="border border-[--border] bg-[--surface] text-[--brand]"
            onClick={() => {
              const ids = certifications.map((cert) => cert.id);
              const currentlyAllSelected = ids.every((id) => selectedCertifications.has(id));
              setSelectedCertifications(currentlyAllSelected ? new Set() : new Set(ids));
            }}
          >
            {certifications.every((cert) => selectedCertifications.has(cert.id))
              ? "Deselect all"
              : "Select all"}
          </Button>
        </header>

        {certifications.length === 0 ? (
          <p className="mt-4 text-sm opacity-70">
            LinkedIn did not return certifications. You can add them manually later.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {certifications.map((cert) => (
              <li
                key={cert.id}
                className="rounded-2xl border border-[--border] bg-white/60 p-4 shadow-sm"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCertifications.has(cert.id)}
                    onChange={() => toggleCertification(cert.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-lg font-semibold text-[--brand]">{cert.name}</p>
                    {cert.issuer ? (
                      <p className="text-sm opacity-80">Issuer: {cert.issuer}</p>
                    ) : null}
                    <p className="text-xs uppercase tracking-wide opacity-60">
                      {formatSpan(cert.issueDate, cert.expirationDate, "No expiry")}
                    </p>
                    {cert.credentialId ? (
                      <p className="text-xs opacity-70">Credential ID: {cert.credentialId}</p>
                    ) : null}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          className="bg-[--brand] text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={!hasSelection || saving}
          isLoading={saving}
        >
          Save to profile
        </Button>
        {!hasSelection ? (
          <p className="text-sm opacity-70">Select at least one item to import.</p>
        ) : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}
      </div>
    </div>
  );
}

function formatSpan(
  start?: string | null,
  end?: string | null,
  emptyFallback = "Present"
): string {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end) || (startLabel ? emptyFallback : undefined);
  if (!startLabel && !endLabel) return "Dates not provided";
  if (!startLabel) return endLabel ?? "Dates not provided";
  if (!endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
