import { Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { captureSourceLabel } from "@/features/captures/labels";
import { useCaptureFeed, useSimulateCapture } from "@/features/captures/queries";
import { cn, displayMetricValue, formatRelativeTime } from "@/lib/utils";

const KEY_METRICS = ["heart_rate", "spo2", "body_temp_c"];

export function CaptureStrip({ className }: { className?: string }) {
  const feedQuery = useCaptureFeed();
  const simulate = useSimulateCapture();
  const feed = feedQuery.data;
  const hasMetrics = Boolean(feed && feed.metrics.length > 0);
  const keyMetrics = (feed?.metrics ?? []).filter((metric) =>
    KEY_METRICS.includes(metric.metric_code),
  );

  const captureNow = () => {
    simulate.mutate(undefined, {
      onSuccess: () => toast.success("Sensor capture received."),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Unable to simulate a sensor capture.",
        ),
    });
  };

  return (
    <div
      className={cn("mt-3 rounded-xl border border-line bg-surface px-4 py-3", className)}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Radio size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-ink">Automatic sensor capture</p>
              <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                Simulated
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {hasMetrics
                ? `${captureSourceLabel(feed?.source)} · ${feed?.metrics.length} readings · ${formatRelativeTime(
                    feed?.captured_at ?? new Date().toISOString(),
                  )} · no astronaut entry`
                : feedQuery.isError
                  ? "Capture feed unavailable. The last readings remain in Telemetry."
                  : "Waiting for the first habitat or suit capture."}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 self-start sm:self-auto"
          onClick={captureNow}
          disabled={simulate.isPending}
        >
          <RefreshCw
            size={12}
            className={simulate.isPending ? "animate-spin" : undefined}
            aria-hidden
          />
          {simulate.isPending ? "Capturing…" : "Capture now"}
        </Button>
      </div>

      {hasMetrics && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {keyMetrics.map((metric) => (
              <span
                key={metric.metric_code}
                className="rounded-lg bg-surface-muted/70 px-2.5 py-1.5 text-[10px] text-ink-2"
              >
                {metric.name}{" "}
                <span className="ml-0.5 text-xs font-semibold tabular text-ink">
                  {displayMetricValue(metric.value)} {metric.unit}
                </span>
              </span>
            ))}
            <Disclosure
              className="ml-auto"
              summary="All readings"
              meta={`${feed?.metrics.length ?? 0}`}
              summaryClassName="justify-end text-[10px] font-medium text-accent"
              bodyClassName="rounded-lg bg-surface-muted/60 p-2"
            >
              <div className="flex flex-wrap gap-1">
                {feed?.metrics.map((metric) => (
                  <span
                    key={metric.metric_code}
                    className="rounded-md border border-line bg-surface px-1.5 py-1 text-[10px] text-ink-2"
                    title={`${metric.name} · ${captureSourceLabel(metric.source)}`}
                  >
                    {metric.name}{" "}
                    <span className="font-semibold tabular text-ink">
                      {displayMetricValue(metric.value)} {metric.unit}
                    </span>
                  </span>
                ))}
              </div>
            </Disclosure>
          </div>
        </div>
      )}
    </div>
  );
}
