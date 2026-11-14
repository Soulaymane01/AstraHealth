import { Link } from "react-router-dom";

import { Sparkline } from "@/components/ui/Sparkline";
import { StatusBadge } from "@/components/ui/Status";
import type { DomainMetricSummary } from "@/lib/api/types";
import { asStatus } from "@/lib/status";
import { cn, displayMetricValue, formatSigned } from "@/lib/utils";

import { frequencyLabel, metricPath, type RangeDays } from "@/features/telemetry/telemetry-config";

function baselineText(metric: DomainMetricSummary): string {
  if (!metric.baseline) return "No baseline yet";
  return `Baseline ${displayMetricValue(metric.baseline.lower)}–${displayMetricValue(metric.baseline.upper)} ${metric.unit}`;
}

export interface MetricSummaryCardProps {
  metric: DomainMetricSummary;
  days: RangeDays;
}

export function MetricSummaryCard({ metric, days }: MetricSummaryCardProps) {
  const status = asStatus(metric.status);
  const hasInRange = metric.point_count > 0;
  const lastInRange =
    metric.sparkline.length > 0 ? metric.sparkline[metric.sparkline.length - 1] : null;
  const hasLatest = metric.latest !== null;

  return (
    <Link
      to={metricPath(metric.metric, days)}
      className="card-shadow group flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{metric.label}</p>
          <p className="mt-0.5 text-[10px] text-muted">{frequencyLabel(metric.frequency)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {hasInRange && lastInRange !== null ? (
            <p className="text-2xl font-semibold tabular tracking-tight text-ink">
              {displayMetricValue(lastInRange)}
              <span className="ml-1 text-xs font-normal text-muted">{metric.unit}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">No readings in this range</p>
          )}
          {!hasInRange && hasLatest && metric.latest && (
            <p className="mt-0.5 text-[10px] text-muted">
              Latest {displayMetricValue(metric.latest.value)} {metric.unit}
            </p>
          )}
        </div>
        <Sparkline values={metric.sparkline} status={status} width={88} height={26} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          {metric.point_count} reading{metric.point_count === 1 ? "" : "s"} ·{" "}
          {frequencyLabel(metric.frequency).toLowerCase()}
        </span>
        {metric.delta !== null && (
          <span className={cn("tabular", metric.delta >= 0 ? "text-nominal" : "text-caution")}>
            {formatSigned(metric.delta, Number.isInteger(metric.delta) ? 0 : 1)} vs previous
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="truncate text-[10px] text-muted">{baselineText(metric)}</span>
        <span className="shrink-0 text-[10px] font-medium text-accent">Open detail →</span>
      </div>
    </Link>
  );
}
