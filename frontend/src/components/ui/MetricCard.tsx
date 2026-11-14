import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatusBadge } from "@/components/ui/Status";
import { type Status } from "@/lib/status";
import { cn, formatNumber, formatSigned } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  status: Status;
  delta?: number;
  deltaWindow?: string;
  series?: number[];
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  decimals = 0,
  status,
  delta,
  deltaWindow = "7d",
  series = [],
  className,
}: MetricCardProps) {
  const DeltaIcon =
    delta === undefined || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <Panel className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">
          {formatNumber(value, decimals)}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <DeltaIcon size={12} aria-hidden />
          {delta === undefined ? "No trend" : `${formatSigned(delta, decimals)} ${deltaWindow}`}
        </span>
        <Sparkline values={series} status={status} width={80} height={20} />
      </div>
    </Panel>
  );
}
