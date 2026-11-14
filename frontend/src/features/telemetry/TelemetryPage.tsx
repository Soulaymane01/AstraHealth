import { Activity, ArrowRight, LineChart } from "lucide-react";
import { Link } from "react-router-dom";

import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/Status";
import { useReadiness } from "@/features/readiness/queries";
import { domainPath, metricPath, TELEMETRY_DOMAINS } from "@/features/telemetry/telemetry-config";
import { useMetricDefinitions } from "@/features/telemetry/queries";
import { statusFromScore } from "@/lib/status";

export function TelemetryPage() {
  const metricsQuery = useMetricDefinitions();
  const readinessQuery = useReadiness();
  const readiness = readinessQuery.data;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Telemetry</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Every metric, in context.
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            Open a domain or a metric for a 7, 30, or 90-day trend against your personal baseline
            and the spaceflight reference range. Check-ins, alerts, training, and space weather are
            overlaid on the chart.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
          <LineChart size={12} className="text-accent" aria-hidden />
          Personal baseline · reference range
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {TELEMETRY_DOMAINS.map((domain) => {
          const domainMetrics = (metricsQuery.data ?? []).filter(
            (metric) => metric.domain === domain.label,
          );
          const score = readiness?.domain_scores[domain.key];
          const status = score === undefined ? "unknown" : statusFromScore(score);

          return (
            <Panel
              key={domain.key}
              title={domain.label}
              subtitle={domain.description}
              actions={<StatusPill status={status} />}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular tracking-tight text-ink">
                    {score === undefined ? "—" : score.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted">domain score</span>
                </div>
                <Link
                  to={domainPath(domain.key)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
                >
                  Open domain
                  <ArrowRight size={12} aria-hidden />
                </Link>
              </div>

              {metricsQuery.isLoading ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-7 w-24 rounded-full" />
                  ))}
                </div>
              ) : metricsQuery.isError ? (
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-[11px] text-muted">Unable to load the metric catalog.</p>
                  <button
                    type="button"
                    onClick={() => void metricsQuery.refetch()}
                    className="text-[11px] font-medium text-accent hover:text-accent-strong"
                  >
                    Retry
                  </button>
                </div>
              ) : domainMetrics.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {domainMetrics.map((metric) => (
                    <Link
                      key={metric.code}
                      to={metricPath(metric.code)}
                      title={metric.description}
                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
                    >
                      {metric.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted">No metrics in this domain.</p>
              )}
            </Panel>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-muted/60 px-4 py-3 text-[11px] leading-relaxed text-muted">
        <Activity size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <span>
          Domain scores reflect your current readiness. The detail charts use the range you select
          and never infer a reading that was not measured.
        </span>
      </div>
    </div>
  );
}
