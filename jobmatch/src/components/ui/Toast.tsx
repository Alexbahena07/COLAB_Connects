"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

// Keeps rendering `message` through its fade-out so the text doesn't vanish
// the instant the caller clears it — only `onDismiss` (after the transition)
// actually removes it from the DOM.
export default function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return undefined;
    setDisplayMessage(message);
    setVisible(true);
    const hideTimer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(hideTimer);
  }, [message, durationMs]);

  useEffect(() => {
    if (visible || !displayMessage) return undefined;
    const cleanupTimer = setTimeout(() => {
      setDisplayMessage(null);
      onDismiss();
    }, 300);
    return () => clearTimeout(cleanupTimer);
  }, [visible, displayMessage, onDismiss]);

  if (!displayMessage) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {displayMessage}
      </div>
    </div>
  );
}
