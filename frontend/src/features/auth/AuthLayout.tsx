import { CheckCircle2, Orbit } from "lucide-react";
import type { ReactNode } from "react";

const POINTS = [
  "Six health domains, one readiness score.",
  "Explainable factors, never a black box.",
  "Calm enough to use twice a day for six months.",
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface-muted p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Orbit size={17} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">AstraHealth</p>
            <p className="text-[11px] text-muted">Crew health</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-xs font-medium text-accent">NASA Space Apps 2026</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-ink xl:text-4xl">
            A calmer way to check in.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            A light, low-density health monitor for long-duration spaceflight. Read the state of
            your body, act on the next step, and keep the crew in the loop.
          </p>
          <ul className="mt-7 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-ink-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent/70" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-muted">Guidance only. Not a medical diagnosis.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Orbit size={17} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">AstraHealth</p>
              <p className="text-[11px] text-muted">Crew health</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
