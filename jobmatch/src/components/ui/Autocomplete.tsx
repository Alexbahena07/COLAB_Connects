"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];        // source list
  minChars?: number;        // start suggesting after N chars
  labelClassName?: string;
  inputClassName?: string;
  panelClassName?: string;
  optionClassName?: string;
};

export default function Autocomplete({
  label,
  value = "",
  onChange,
  placeholder,
  options,
  minChars = 2,
  labelClassName = "text-gray-700",
  inputClassName = "border-gray-300",
  panelClassName = "border-gray-200 bg-white",
  optionClassName = "hover:bg-gray-50",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < minChars) return [];
    // simple contains filter; could add startsWith weight, limit, etc.
    return options
      .filter((opt) => opt.toLowerCase().includes(term))
      .slice(0, 8);
  }, [q, options, minChars]);

  return (
    <div className="space-y-1" ref={wrapRef}>
      <label className={`block text-sm font-medium ${labelClassName}`}>{label}</label>
      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            // don’t flip form value until user selects or leaves field
            if (e.target.value.length < minChars) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // on blur, commit whatever is typed
            onChange(q);
          }}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${inputClassName}`}
        />
        {open && suggestions.length > 0 && (
          <ul className={`absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border shadow ${panelClassName}`}>
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 ${optionClassName}`}
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                  onClick={() => {
                    onChange(s);
                    setQ(s);
                    setOpen(false);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
