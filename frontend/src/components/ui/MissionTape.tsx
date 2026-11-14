import {
  Award,
  ClipboardCheck,
  Dumbbell,
  Gift,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { StatusDot } from "@/components/ui/Status";
import type { Status } from "@/lib/status";
import { cn } from "@/lib/utils";

export type TapeEventType =
  "checkin" | "alert" | "training" | "achievement" | "redemption" | "weather";

export interface TapeEvent {
  id: string;
  day: number;
  type: TapeEventType;
  label: string;
  status?: Status;
}

const EVENT_META: Record<TapeEventType, { icon: LucideIcon; className: string; label: string }> = {
  checkin: {
    icon: ClipboardCheck,
    className: "text-accent border-accent/20 bg-accent-soft",
    label: "Check-in",
  },
  alert: {
    icon: TriangleAlert,
    className: "text-caution border-caution/20 bg-caution-soft",
    label: "Alert",
  },
  training: {
    icon: Dumbbell,
    className: "text-nominal border-nominal/20 bg-nominal-soft",
    label: "Training",
  },
  achievement: {
    icon: Award,
    className: "text-watch border-watch/20 bg-watch-soft",
    label: "Commendation",
  },
  redemption: {
    icon: Gift,
    className: "text-accent border-accent/20 bg-accent-soft",
    label: "Allowance",
  },
  weather: {
    icon: Sun,
    className: "text-critical border-critical/20 bg-critical-soft",
    label: "Space weather",
  },
};

export function MissionTape({
  events,
  maxDay = 60,
  className,
}: {
  events: TapeEvent[];
  maxDay?: number;
  className?: string;
}) {
  const step = maxDay <= 7 ? 1 : maxDay <= 30 ? 5 : 10;
  const ticks = Array.from({ length: Math.floor(maxDay / step) + 1 }, (_, index) => index * step);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="overflow-x-auto pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        role="group"
        aria-label="Mission tape timeline"
        tabIndex={0}
      >
        <div className="min-w-[640px] px-5">
          <div className="relative h-24">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-line" />

            {ticks.map((day) => {
              const left = `${(day / maxDay) * 100}%`;
              return (
                <div key={day} className="absolute top-1/2 -translate-y-1/2" style={{ left }}>
                  <span className="block h-2 w-px bg-line-strong" />
                </div>
              );
            })}

            {events.map((event, index) => {
              const meta = EVENT_META[event.type];
              const Icon = meta.icon;
              const left = `${Math.min(100, Math.max(0, (event.day / maxDay) * 100))}%`;
              const offset = index % 2 === 0 ? -12 : 12;

              return (
                <span
                  key={event.id}
                  title={`Day ${event.day} — ${meta.label}: ${event.label}`}
                  aria-hidden
                  className="group absolute top-1/2 z-10 rounded-full"
                  style={{
                    left,
                    transform: `translate(-50%, calc(-50% + ${offset}px))`,
                  }}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border transition-transform group-hover:scale-110",
                      meta.className,
                    )}
                  >
                    <Icon size={11} aria-hidden />
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] tabular text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    D{event.day}
                  </span>
                </span>
              );
            })}
          </div>

          <div className="mt-1 flex justify-between text-[10px] tabular text-muted">
            {ticks.map((day) => (
              <span key={day}>D{String(day).padStart(2, "0")}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3">
        {(Object.keys(EVENT_META) as TapeEventType[]).map((type) => {
          const meta = EVENT_META[type];
          const Icon = meta.icon;
          return (
            <span key={type} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Icon size={11} className={meta.className.split(" ")[0]} aria-hidden />
              {meta.label}
            </span>
          );
        })}
        {events.some((event) => event.status) && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <StatusDot status="critical" />
            <span className="text-xs text-muted">Anomaly window</span>
          </span>
        )}
      </div>

      <ul className="sr-only">
        {events.map((event) => (
          <li key={event.id}>
            Day {event.day}: {EVENT_META[event.type].label} — {event.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
