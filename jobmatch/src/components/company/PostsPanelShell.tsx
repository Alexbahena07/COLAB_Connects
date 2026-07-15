import { FormEvent, ReactNode } from "react";

export function PostsFilterBar({
  title,
  subtitle,
  switcher,
}: {
  title: string;
  subtitle: string;
  switcher?: ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-brand/10 bg-brand/5">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-brand">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
          {switcher}
        </div>
      </div>
    </div>
  );
}

export function PostListPanel({
  title,
  subtitle,
  extra,
  children,
}: {
  title: string;
  subtitle: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex max-h-[50vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:max-h-none md:min-h-0 md:flex-1">
      <div className="shrink-0 border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-brand">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
        {extra}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

export function PostFormPanel({
  title,
  subtitle,
  badge,
  onSubmit,
  noValidate,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  noValidate?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col overflow-hidden rounded-2xl bg-brand shadow-sm md:min-h-0 md:w-105 md:shrink-0">
      <div className="shrink-0 border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/70">{subtitle}</p>
        {badge}
      </div>
      <form className="min-h-0 flex-1 overflow-y-auto p-6" onSubmit={onSubmit} noValidate={noValidate}>
        <div className="space-y-4">{children}</div>
      </form>
    </section>
  );
}

export const EditingBadge = ({ label }: { label: string }) => (
  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
    Editing: {label}
  </span>
);

export function listCardClass(isActiveEdit: boolean) {
  return `rounded-2xl border bg-background p-4 shadow-sm transition ${
    isActiveEdit
      ? "border-brand/40 ring-2 ring-brand/15"
      : "border-border hover:border-brandBlue/40 hover:shadow-md"
  }`;
}

export function editButtonClass(isActiveEdit: boolean) {
  return `h-8 rounded-lg px-3 text-xs font-semibold transition ${
    isActiveEdit ? "bg-brand text-white" : "btn-outline-brand"
  }`;
}

export const deleteButtonClass =
  "h-8 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50";

export const brandInputClass = "border-white/25 bg-white/10 text-white placeholder:text-white/45 focus:ring-white/20";
export const brandLabelClass = "text-white/90";

export const FormErrorBanner = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-red-300/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
    {message}
  </div>
);

export const FormSuccessBanner = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
    {message}
  </div>
);
