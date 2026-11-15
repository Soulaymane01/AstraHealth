import { ArrowRight, Orbit, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth-store";
import { isFlightSurgeon } from "@/lib/roles";

type Role = "astronaut" | "surgeon";

export function LandingPage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated" && user) {
    return <Navigate to={isFlightSurgeon(user) ? "/surgeon" : "/"} replace />;
  }

  const enter = async (role: Role) => {
    setError(null);
    setLoading(role);
    try {
      await login(
        role === "astronaut" ? "commander@astra.space" : "surgeon@astra.space",
        "astra-demo",
      );
      navigate(role === "surgeon" ? "/surgeon" : "/", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open the demo.");
      setLoading(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-canvas px-5 py-10 text-ink sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-5xl flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Orbit size={19} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[-0.01em]">AstraHealth</p>
            <p className="text-[11px] text-muted">Crew health · NASA Space Apps 2026</p>
          </div>
        </div>

        <div className="mt-12 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Demo mission
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Choose your view.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
            Enter the astronaut flight deck or the Earth-side flight surgeon console. No account,
            email, or password required.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void enter("astronaut")}
            disabled={loading !== null}
            className="group flex min-h-[220px] flex-col rounded-3xl border border-line bg-surface p-6 text-left shadow-[0_18px_50px_rgba(11,61,145,0.08)] transition-transform duration-150 hover:-translate-y-1 hover:border-accent/30 disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Orbit size={22} aria-hidden />
            </span>
            <span className="mt-8 text-2xl font-semibold tracking-[-0.03em]">Astronaut</span>
            <span className="mt-2 text-sm leading-relaxed text-ink-2">
              Check in with your body, see what is driving readiness, and get the next action.
            </span>
            <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-accent">
              {loading === "astronaut" ? "Opening flight deck…" : "Enter flight deck"}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>

          <button
            type="button"
            onClick={() => void enter("surgeon")}
            disabled={loading !== null}
            className="group flex min-h-[220px] flex-col rounded-3xl border border-line bg-surface p-6 text-left shadow-[0_18px_50px_rgba(11,61,145,0.08)] transition-transform duration-150 hover:-translate-y-1 hover:border-accent/30 disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-watch-soft text-watch">
              <Stethoscope size={22} aria-hidden />
            </span>
            <span className="mt-8 text-2xl font-semibold tracking-[-0.03em]">Flight Surgeon</span>
            <span className="mt-2 text-sm leading-relaxed text-ink-2">
              Review the crew, early-warning signals, clinical notes, and the full record.
            </span>
            <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-accent">
              {loading === "surgeon" ? "Opening console…" : "Enter surgeon console"}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-critical/20 bg-critical-soft px-4 py-3 text-sm text-critical">
            {error}
          </div>
        )}

        <p className="mt-8 flex items-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck size={12} aria-hidden />
          Guidance only. Not a medical diagnosis. Simulated crew and telemetry.
        </p>
      </div>
    </main>
  );
}
