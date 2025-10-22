// src/components/ui/Button.tsx
import { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean };

export default function Button({ isLoading, className, children, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  return (
    <button {...props} className={twMerge(clsx(base, className))} disabled={isLoading || props.disabled}>
      {isLoading ? "Loading…" : children}
    </button>
  );
}
