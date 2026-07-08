"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ALL_LABEL = "Open to all locations";

type Props = {
  label: string;
  // Stored as comma-separated state names, or "all" for open to all.
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelClassName?: string;
  inputClassName?: string;
  panelClassName?: string;
  optionClassName?: string;
};

export default function LocationMultiSelect({
  label,
  value,
  onChange,
  options,
  labelClassName = "",
  inputClassName = "",
  panelClassName = "",
  optionClassName = "",
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected: string[] = useMemo(() => {
    if (!value) return [];
    if (value === "all") return [ALL_LABEL];
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }, [value]);

  const isAll = selected[0] === ALL_LABEL;

  const filtered = useMemo(() => {
    const allOptions = [ALL_LABEL, ...options];
    const term = q.trim().toLowerCase();
    return allOptions
      .filter((opt) => !selected.includes(opt))
      .filter((opt) => !term || opt.toLowerCase().includes(term))
      .slice(0, 10);
  }, [q, options, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const add = (opt: string) => {
    setQ("");
    if (opt === ALL_LABEL) {
      onChange("all");
    } else {
      const current = selected.filter((s) => s !== ALL_LABEL);
      if (!current.includes(opt)) onChange([...current, opt].join(", "));
    }
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (opt: string) => {
    if (opt === ALL_LABEL) {
      onChange("");
    } else {
      const next = selected.filter((s) => s !== opt);
      onChange(next.join(", "));
    }
  };

  return (
    <div className="space-y-1" ref={wrapRef}>
      <label className={`block text-sm font-medium ${labelClassName}`}>{label}</label>
      <div className="relative">
        {/* Input area — chips + text input side by side */}
        <div
          role="combobox"
          aria-expanded={open}
          className={`flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 ${inputClassName}`}
          onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        >
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-brandBlue/10 px-2.5 py-0.5 text-xs font-semibold text-brandBlue"
            >
              {s}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); remove(s); }}
                aria-label={`Remove ${s}`}
                className="ml-0.5 hover:opacity-70"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {!isAll && (
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={selected.length === 0 ? "Search states" : "Search states"}
              className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
          )}
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <ul className={`absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border shadow-lg ${panelClassName}`}>
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm ${opt === ALL_LABEL ? "font-semibold" : ""} ${optionClassName}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
