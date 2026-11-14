import {
  Apple,
  ArrowRight,
  Brain,
  HeartPulse,
  Moon,
  ShieldCheck,
  Bone,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/Status";
import { useReadiness } from "@/features/readiness/queries";
import { domainPath, TELEMETRY_DOMAINS } from "@/features/telemetry/telemetry-config";
import { useMetricDefinitions } from "@/features/telemetry/queries";
import { STATUS_META, statusFromScore } from "@/lib/status";
import { cn } from "@/lib/utils";

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  cardiovascular: HeartPulse,
  musculoskeletal: Bone,
  sleep: Moon,
  neurobehavioral: Brain,
  metabolic: Apple,
  immune: ShieldCheck,
};

export function TelemetryPage() {
  const metricsQuery = useMetricDefinitions();
  const readinessQuery = useReadiness();
  const readiness = readinessQuery.data;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Telemetry
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Your body, by domain.
          </h1>
          <p className="mt-1 text-sm text-muted">Tap a card for trends and readings.</p>
        </div>
        <span className="text-[11px] text-muted">7 · 30 · 90 days</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TELEMETRY_DOMAINS.map((domain) => {
          const domainMetrics = (metricsQuery.data ?? []).filter(
            (metric) => metric.domain === domain.label,
          );
          const score = readiness?.domain_scores[domain.key];
          const status = score === undefined ? "unknown" : statusFromScore(score);
          const meta = STATUS_META[status];
          const Icon = DOMAIN_ICONS[domain.key] ?? HeartPulse;

          return (
            <Link
              key={domain.key}
              to={domainPath(domain.key)}
              className={cn(
                "group relative flex min-h-[190px] flex-col overflow-hidden rounded-3xl border p-4 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(10,42,92,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:p-5",
                meta.surface,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/75">
                  <Icon size={20} className={meta.text} aria-hidden />
                </span>
                <StatusPill status={status} />
              </div>

              <div className="mt-auto pt-4">
                <p className="text-base font-semibold tracking-[-0.01em] text-ink">
                  {domain.label}
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  {metricsQuery.isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-4xl font-semibold leading-none tabular tracking-tight text-ink">
                      {score === undefined ? "—" : score.toFixed(1)}
                    </p>
                  )}
                  <span className={cn("pb-1 text-[10px] font-medium", meta.text)}>
                    {metricsQuery.isLoading
                      ? "loading"
                      : `${domainMetrics.length} metric${domainMetrics.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5">
                  <span className="text-[10px] text-ink-2">{meta.description}</span>
                  <ArrowRight
                    size={14}
                    className="text-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {metricsQuery.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-watch/25 bg-watch-soft px-3 py-2 text-[11px] text-watch">
          <span>Metric catalog unavailable.</span>
          <button
            type="button"
            onClick={() => void metricsQuery.refetch()}
            className="font-semibold underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
