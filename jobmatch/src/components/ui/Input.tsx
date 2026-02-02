"use client";
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  id?: string;
  rightSection?: React.ReactNode;
  labelClassName?: string;
};

export default function Input({
  label,
  id,
  error,
  className = "",
  rightSection,
  // ✅ default to your theme, not gray
  labelClassName = "text-[var(--foreground)]",
  ...rest
}: Props) {
  const inputId = id ?? `input-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className={`block text-sm font-medium ${labelClassName}`}>
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          className={[
            "w-full rounded-xl border px-3 py-2 pr-12 outline-none",
            // ✅ tokens
            "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/60",
            "focus:ring-2 focus:ring-[var(--foreground)]/15",
            error ? "border-red-400" : "",
            className,
          ].join(" ")}
          {...rest}
        />
        {rightSection ? (
          <div className="absolute inset-y-0 right-0 flex items-center px-3">{rightSection}</div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
