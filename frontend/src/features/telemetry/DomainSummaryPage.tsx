import { ChevronRight, Plus } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/Status";
import { MetricSummaryCard } from "@/features/telemetry/components/MetricSummaryCard";
import { SegmentedControl } from "@/features/telemetry/components/SegmentedControl";
import { useDomainSummary } from "@/features/telemetry/queries";
import {
  parseRange,
  TELEMETRY_DOMAINS,
  TELEMETRY_RANGES,
  type RangeDays,
} from "@/features/telemetry/telemetry-config";
import { asStatus } from "@/lib/status";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function DomainSummaryPage() {
  const navigate = useNavigate();
  const params = useParams<{ domain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const days = parseRange(searchParams.get("days"));
  const domainKey = params.domain ?? null;
  const domain = TELEMETRY_DOMAINS.find((item) => item.key === domainKey);
  const summaryQuery = useDomainSummary(domain ? domainKey : null, days);

  const setDays = (nextDays: RangeDays) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("days", String(nextDays));
        return next;
      },
      { replace: true },
    );
  };

  if (!domain) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Panel title="Domain not found">
          <p className="text-[13px] leading-relaxed text-ink-2">
            That telemetry domain does not exist.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => navigate("/telemetry")}
          >
            Back to telemetry
          </Button>
        </Panel>
      </div>
    );
  }

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <PageSkeleton />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <QueryError
        title="Domain summary unavailable"
        message={
          summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : "The domain summary could not be loaded."
        }
        onRetry={() => void summaryQuery.refetch()}
        retrying={summaryQuery.isFetching}
        secondaryAction={
          <Button variant="ghost" size="sm" onClick={() => navigate("/telemetry")}>
            Back to telemetry
          </Button>
        }
      />
    );
  }

  const summary = summaryQuery.data;
  const status = asStatus(summary.status);
  const rangeOptions = TELEMETRY_RANGES.map((value) => ({
    value,
    label: `${value} days`,
  }));

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Link to="/telemetry" className="hover:text-ink">
          Telemetry
        </Link>
        <ChevronRight size={12} aria-hidden />
        <span className="text-ink-2">{summary.label}</span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Domain summary</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            {summary.label}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{domain.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Telemetry range"
            value={days}
            options={rangeOptions}
            onChange={setDays}
          />
          <span className="text-[11px] text-muted" aria-live="polite">
            {summaryQuery.isPlaceholderData ? "Updating…" : ""}
          </span>
        </div>
      </div>

      <Panel
        className="mt-6"
        title="Domain readiness"
        subtitle="Mean of the metrics with a personal baseline."
        actions={<StatusPill status={status} />}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular tracking-tight text-ink">
              {summary.score === null ? "—" : summary.score.toFixed(1)}
            </span>
            <span className="text-sm text-muted">/ 100</span>
          </div>
          <div className="text-left text-xs text-muted sm:text-right">
            <p>
              {summary.covered_metrics} of {summary.total_metrics} metrics with readings in this
              range
            </p>
            <p>
              {summary.range_days} days · {formatDate(summary.from_at)} –{" "}
              {formatDate(summary.to_at)}
            </p>
          </div>
        </div>

        {summary.covered_metrics === 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-ink-2">
              No readings in this domain for the selected range.
            </p>
            <div className="flex flex-wrap gap-2">
              {days < 90 && (
                <Button variant="secondary" size="sm" onClick={() => setDays(90)}>
                  Try 90 days
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => navigate("/check-in")}>
                <Plus size={13} aria-hidden />
                Start a check-in
              </Button>
            </div>
          </div>
        )}

        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          The domain score reflects your current readings. Each chart below follows the selected
          range.
        </p>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.metrics.map((metric) => (
          <MetricSummaryCard key={metric.metric} metric={metric} days={days} />
        ))}
      </div>
    </div>
  );
}
