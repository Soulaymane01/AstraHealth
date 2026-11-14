import type { LucideIcon } from "lucide-react";

export interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}

export function PagePlaceholder({ icon: Icon, title, description, phase }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <div className="card-shadow w-full rounded-xl border border-line bg-surface p-8 text-center sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={20} aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{description}</p>
        <span className="mt-4 inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs text-muted">
          {phase}
        </span>
      </div>
    </div>
  );
}
