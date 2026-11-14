import { Activity, ChevronRight, Download, ExternalLink, Plus } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/Status";
import { useMissionTape } from "@/features/mission/queries";
import { EventRail } from "@/features/telemetry/components/EventRail";
import { MetricChart } from "@/features/telemetry/components/MetricChart";
import { SegmentedControl } from "@/features/telemetry/components/SegmentedControl";
import { exportMetricCsv } from "@/features/telemetry/csv";
import { useMetricSeries } from "@/features/telemetry/queries";
import {
  domainMetaForLabel,
  domainPath,
  frequencyLabel,
  parseBand,
  parseRange,
  sourceLabel,
  TELEMETRY_RANGES,
  type BandMode,
  type RangeDays,
} from "@/features/telemetry/telemetry-config";
import { articleForDomain } from "@/lib/knowledge";
import { asStatus } from "@/lib/status";
import { cn, displayMetricValue, formatSigned } from "@/lib/utils";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

function formatBand(lower: number | null, upper: number | null, unit: string): string | null {
  if (lower !== null && upper !== null) {
    return `${displayMetricValue(lower)}–${displayMetricValue(upper)} ${unit}`;
  }
  if (lower !== null) return `≥ ${displayMetricValue(lower)} ${unit}`;
  if (upper !== null) return `≤ ${displayMetricValue(upper)} ${unit}`;
  return null;
}

export function MetricDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const days = parseRange(searchParams.get("days"));
  const band = parseBand(searchParams.get("band"));
  const code = params.code ?? null;
  const seriesQuery = useMetricSeries(code, days);
  const tapeQuery = useMissionTape(days);

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

  const setBand = (nextBand: BandMode) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("band", nextBand);
        return next;
      },
      { replace: true },
    );
  };

  if (seriesQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (seriesQuery.isError || !seriesQuery.data) {
    return (
      <QueryError
        title="Metric unavailable"
        message={
          seriesQuery.error instanceof Error
            ? seriesQuery.error.message
            : "The metric series could not be loaded."
        }
        onRetry={() => void seriesQuery.refetch()}
        retrying={seriesQuery.isFetching}
        secondaryAction={
          <Button variant="ghost" size="sm" onClick={() => navigate("/telemetry")}>
            Back to telemetry
          </Button>
        }
      />
    );
  }

  const series = seriesQuery.data;
  const metric = series.metric;
  const status = asStatus(series.status);
  const domain = domainMetaForLabel(metric.domain);
  const baseline = series.baseline;
  const hasBaseline = baseline !== null;
  const hasReference = series.reference.lower !== null || series.reference.upper !== null;
  const hasAnyBand = hasBaseline || hasReference;
  const latest = series.latest;
  const latestInRange = series.latest_in_range;
  const events = (tapeQuery.data ?? []).filter((event) =>
    ["checkin", "alert", "training", "weather"].includes(event.type),
  );

  const rangeOptions = TELEMETRY_RANGES.map((value) => ({
    value,
    label: `${value} days`,
  }));

  const bandOptions = [
    {
      value: "baseline" as const,
      label: "Your baseline",
      disabled: !hasBaseline,
      title: hasBaseline
        ? "Show the personal 21-day baseline band."
        : "Needs at least three readings in the 21-day baseline window.",
    },
    {
      value: "reference" as const,
      label: "Spaceflight range",
      disabled: !hasReference,
      title: hasReference
        ? "Show the spaceflight reference range."
        : "No spaceflight reference range is defined for this metric.",
    },
  ];

  const referenceText = formatBand(series.reference.lower, series.reference.upper, metric.unit);

  const deltaText =
    series.delta === null
      ? "No previous reading."
      : `${formatSigned(series.delta, Number.isInteger(series.delta) ? 0 : 1)} ${metric.unit} vs previous`;

  let zText = "No personal baseline yet.";
  if (series.stale) {
    zText = `Latest reading is older than the usual ${frequencyLabel(metric.frequency).toLowerCase()} cadence.`;
  } else if (series.z !== null && series.subscore !== null) {
    zText = `${Math.abs(series.z).toFixed(1)} SD ${
      series.z < 0 ? "below" : "above"
    } baseline · subscore ${series.subscore}/100`;
  } else if (latest === null) {
    zText = "No current reading.";
  }

  const bandDescription =
    band === "baseline"
      ? baseline
        ? `Your baseline band is ${displayMetricValue(baseline.lower)}–${displayMetricValue(
            baseline.upper,
          )} ${metric.unit} (median ${displayMetricValue(baseline.center)}, ±1 SD, ${
            baseline.points
          } readings).`
        : "A personal baseline needs at least three readings in the 21-day window ending three days before today."
      : referenceText
        ? `Spaceflight reference range: ${referenceText}. This is a population reference, not a personal target.`
        : "No spaceflight reference range is defined for this metric.";

  const recent = series.points.slice(-5).reverse();
  const articleSlug = articleForDomain(metric.domain);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link to="/telemetry" className="hover:text-ink">
          Telemetry
        </Link>
        <ChevronRight size={12} aria-hidden />
        {domain ? (
          <>
            <Link to={domainPath(domain.key, days)} className="hover:text-ink">
              {domain.label}
            </Link>
            <ChevronRight size={12} aria-hidden />
          </>
        ) : null}
        <span className="text-ink-2">{metric.name}</span>
      </div>

      <div className="mt-3">
        <p className="text-sm font-medium text-accent">Metric detail</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">{metric.name}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{metric.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>{frequencyLabel(metric.frequency)}</span>
          <span aria-hidden>·</span>
          <span>{metric.unit}</span>
          <span aria-hidden>·</span>
          <span>{metric.source_types.map(sourceLabel).join(", ")}</span>
          <span aria-hidden>·</span>
          <span>21-day personal baseline</span>
        </div>
      </div>

      <Panel className="mt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted">Latest reading</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-semibold tabular tracking-tight text-ink">
                {latest ? displayMetricValue(latest.value) : "—"}
              </span>
              <span className="pb-1 text-sm text-muted">{metric.unit}</span>
              <StatusPill status={status} />
              {latest && !latestInRange && (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">
                  Outside this range
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              {latest
                ? `${formatDateTime(latest.measured_at)} · ${sourceLabel(latest.source)}`
                : series.points.length > 0
                  ? "No current reading; showing older points in this range."
                  : "No reading in the selected range."}
            </p>
            {series.stale && (
              <p className="mt-1 text-[10px] text-watch">
                The latest reading is outside the usual measurement cadence.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 lg:justify-end">
            <div className="text-xs text-muted lg:text-right">
              <p>{deltaText}</p>
              <p className="mt-0.5">{zText}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportMetricCsv(series)}
              disabled={series.points.length === 0}
              title={
                series.points.length === 0
                  ? "No readings in this range to export."
                  : `Export ${series.points.length} readings as CSV.`
              }
            >
              <Download size={13} aria-hidden />
              Export CSV
            </Button>
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel title="Trend" subtitle={`${metric.name} over the last ${days} days.`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                label="Telemetry range"
                value={days}
                options={rangeOptions}
                onChange={setDays}
              />
              {hasAnyBand && (
                <SegmentedControl
                  label="Comparison band"
                  value={band}
                  options={bandOptions}
                  onChange={setBand}
                />
              )}
            </div>

            {series.points.length === 0 ? (
              <div className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-lg bg-surface-muted/50 px-4 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted">
                  <Activity size={18} aria-hidden />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">
                  No readings in the last {days} days.
                </p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
                  {latest
                    ? `Your latest reading was ${formatDateTime(latest.measured_at)}. Try a longer range or complete another check-in.`
                    : "Complete a Systems Check or add a measurement to start this trend."}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {days !== 90 && (
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
            ) : (
              <>
                <MetricChart series={series} band={band} events={events} />
                <p className="mt-2 text-[11px] leading-relaxed text-muted">{bandDescription}</p>
                {series.points.length === 1 && (
                  <p className="mt-1 text-[10px] text-muted">
                    One reading in this range. A trend needs at least two points.
                  </p>
                )}
              </>
            )}

            <p className="sr-only">
              {metric.name} trend over {days} days. {series.stats.count} readings.{" "}
              {latest
                ? `Latest reading ${displayMetricValue(latest.value)} ${metric.unit} on ${formatDateTime(
                    latest.measured_at,
                  )}.`
                : "No reading in this range."}{" "}
              {baseline
                ? `Personal baseline ${displayMetricValue(
                    baseline.lower,
                  )} to ${displayMetricValue(baseline.upper)} ${metric.unit}.`
                : "No personal baseline yet."}{" "}
              {referenceText ? `Spaceflight reference ${referenceText}.` : ""} {events.length}{" "}
              check-in, alert, training, or space weather events are overlaid.
            </p>

            {tapeQuery.isLoading ? (
              <p className="mt-3 ml-11 text-[10px] text-muted">Loading events…</p>
            ) : tapeQuery.isError ? (
              <div className="mt-3 ml-11 flex items-center gap-2">
                <p className="text-[10px] text-muted">Events unavailable.</p>
                <button
                  type="button"
                  onClick={() => void tapeQuery.refetch()}
                  className="text-[10px] font-medium text-accent hover:text-accent-strong"
                >
                  Retry
                </button>
              </div>
            ) : (
              <EventRail events={events} fromAt={series.from_at} toAt={series.to_at} />
            )}
          </Panel>

          <Panel
            className="mt-4"
            title="How this is calculated"
            subtitle="The same engine that powers the Flight Deck."
          >
            <p className="text-[13px] leading-relaxed text-ink-2">
              Your baseline is the median and standard deviation of readings in the 21-day window
              ending three days before today. The band is ±1 SD. Status uses{" "}
              <span className="font-mono text-[12px] text-ink">100 − 18 × |z|</span>, where{" "}
              <span className="font-mono text-[12px] text-ink">z</span> is the distance from your
              median in baseline standard deviations. A single reading is never treated as a
              diagnosis.
            </p>
            {articleSlug && (
              <Link
                to={`/library/${articleSlug}`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-strong"
              >
                <ExternalLink size={11} aria-hidden />
                Read the HRP guidance on {metric.domain}
              </Link>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Panel
            title="Your baseline"
            subtitle="21-day median and ±1 SD."
            className={cn(band === "baseline" && hasBaseline && "border-accent/30")}
            actions={
              band === "baseline" && hasBaseline ? (
                <span className="text-[10px] font-medium text-accent">Chart band</span>
              ) : undefined
            }
          >
            {baseline ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold tabular text-ink">
                    {displayMetricValue(baseline.center)}
                    <span className="ml-1 text-xs font-normal text-muted">{metric.unit}</span>
                  </span>
                  <span className="text-[10px] text-muted">median</span>
                </div>
                <p className="text-[11px] text-ink-2">
                  Band {displayMetricValue(baseline.lower)}–{displayMetricValue(baseline.upper)}{" "}
                  {metric.unit} · ±1 SD ({displayMetricValue(baseline.sd)})
                </p>
                <p className="text-[10px] text-muted">
                  {baseline.points} readings · {formatDay(baseline.start)}–{formatDay(baseline.end)}
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted">
                At least three readings in the 21-day baseline window are needed. Keep checking in
                to build it.
              </p>
            )}
          </Panel>

          <Panel
            title="Spaceflight reference"
            subtitle="Population range, not a personal target."
            className={cn(band === "reference" && hasReference && "border-accent/30")}
            actions={
              band === "reference" && hasReference ? (
                <span className="text-[10px] font-medium text-accent">Chart band</span>
              ) : undefined
            }
          >
            {referenceText ? (
              <>
                <p className="text-lg font-semibold tabular text-ink">{referenceText}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  The reference range is defined by the metric catalog. It is not a substitute for
                  your own baseline.
                </p>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted">
                No spaceflight reference range is defined for this metric.
              </p>
            )}
          </Panel>

          <Panel title="Recent readings" subtitle={`Last ${recent.length} in this range.`}>
            {recent.length > 0 ? (
              <ul className="divide-y divide-line">
                {recent.map((point) => (
                  <li key={point.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium tabular text-ink">
                        {displayMetricValue(point.value)}{" "}
                        <span className="text-[10px] font-normal text-muted">{metric.unit}</span>
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {formatDateTime(point.measured_at)} · {sourceLabel(point.source)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted">No readings in this range.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
