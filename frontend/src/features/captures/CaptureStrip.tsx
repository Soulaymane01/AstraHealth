import { Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { captureSourceLabel } from "@/features/captures/labels";
import { useCaptureFeed, useSimulateCapture } from "@/features/captures/queries";
import { cn, displayMetricValue, formatRelativeTime } from "@/lib/utils";

export function CaptureStrip({ className }: { className?: string }) {
  const feedQuery = useCaptureFeed();
  const simulate = useSimulateCapture();
  const feed = feedQuery.data;
  const hasMetrics = Boolean(feed && feed.metrics.length > 0);

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
      className={cn(
        "mt-4 flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent-soft/30 px-4 py-3",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
            <Radio size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">Automatic sensor capture</p>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                Simulated
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {hasMetrics
                ? `${captureSourceLabel(feed?.source)} · ${feed?.metrics.length} readings · ${formatRelativeTime(
                    feed?.captured_at ?? new Date().toISOString(),
                  )}`
                : feedQuery.isError
                  ? "Capture feed unavailable. The last readings remain in Telemetry."
                  : "Waiting for the first habitat or suit capture."}
              {hasMetrics && " · no astronaut entry"}
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
          <RefreshCw size={12} className={simulate.isPending ? "animate-spin" : undefined} aria-hidden />
          {simulate.isPending ? "Capturing…" : "Capture now"}
        </Button>
      </div>

      {hasMetrics && (
        <div className="flex flex-wrap gap-1.5">
          {feed?.metrics.slice(0, 10).map((metric) => (
            <span
              key={metric.metric_code}
              className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] text-ink-2"
              title={`${metric.name} · ${captureSourceLabel(metric.source)}`}
            >
              {metric.name}{" "}
              <span className="font-semibold tabular text-ink">
                {displayMetricValue(metric.value)} {metric.unit}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
