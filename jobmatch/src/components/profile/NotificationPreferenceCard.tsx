"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";

type NotificationFrequency = "NONE" | "DAILY" | "WEEKLY";

type StatusMessage = { type: "error" | "success"; message: string } | null;

const OPTIONS: { value: NotificationFrequency; label: string; description: string }[] = [
  {
    value: "NONE",
    label: "None",
    description: "Pause job notifications entirely.",
  },
  {
    value: "DAILY",
    label: "Daily summary",
    description: "Get a daily email with new roles from companies you follow.",
  },
  {
    value: "WEEKLY",
    label: "Weekly summary",
    description: "Get a weekly round-up of new roles from companies you follow.",
  },
];

export default function NotificationPreferenceCard() {
  const [frequency, setFrequency] = useState<NotificationFrequency>("WEEKLY");
  const [savedFrequency, setSavedFrequency] = useState<NotificationFrequency>("WEEKLY");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);

  const description = useMemo(
    () => OPTIONS.find((option) => option.value === frequency)?.description ?? "",
    [frequency]
  );

  useEffect(() => {
    let active = true;
    const loadPreference = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/notifications/preference", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load your notification settings.";
          setStatus({ type: "error", message: errorMessage });
          return;
        }

        if (payload?.frequency) {
          setFrequency(payload.frequency);
          setSavedFrequency(payload.frequency);
        }
      } catch (error) {
        console.error("Failed to load notification preference", error);
        if (!active) return;
        setStatus({
          type: "error",
          message: "We couldn't load your notification settings.",
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPreference();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/notifications/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't save your preference.";
        setStatus({ type: "error", message: errorMessage });
        return;
      }

      if (payload?.frequency) {
        setFrequency(payload.frequency);
        setSavedFrequency(payload.frequency);
      }
      setStatus({ type: "success", message: "Preferences saved." });
    } catch (error) {
      console.error("Failed to save notification preference", error);
      setStatus({ type: "error", message: "We couldn't save your preference." });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = frequency !== savedFrequency;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[--foreground]/80">
        Choose how often you want a summary of new jobs from companies you follow.
      </p>
      <div className="space-y-2">
        <label htmlFor="notification-frequency" className="text-sm font-medium text-[--foreground]">
          Frequency
        </label>
        <select
          id="notification-frequency"
          value={frequency}
          onChange={(event) => {
            setFrequency(event.target.value as NotificationFrequency);
            setStatus(null);
          }}
          className="h-11 w-full rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
          disabled={isLoading}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {description ? (
          <p className="text-xs text-[--foreground]/70">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="btn-brand h-11"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!hasChanges || isLoading}
        >
          Save preferences
        </Button>
        {status ? (
          <span
            className={
              status.type === "error"
                ? "text-xs text-red-500"
                : "text-xs text-emerald-500"
            }
          >
            {status.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
