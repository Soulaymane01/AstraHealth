import { ChevronDown } from "lucide-react";

import type { TapeEvent } from "@/lib/api/types";
import { asStatus, STATUS_META } from "@/lib/status";
import { clamp } from "@/lib/utils";

const EVENT_COLORS: Record<string, string> = {
  checkin: "#0B3D91",
  alert: "#A33B0C",
  training: "#036B53",
  weather: "#92400E",
};

const EVENT_LABELS: Record<string, string> = {
  checkin: "Check-in",
  alert: "Alert",
  training: "Training",
  weather: "Space weather",
};

function eventColor(event: TapeEvent): string {
  if (event.type === "alert") {
    return STATUS_META[asStatus(event.status ?? "unknown")].hex;
  }
  return EVENT_COLORS[event.type] ?? "#475569";
}

function eventLabel(event: TapeEvent): string {
  return EVENT_LABELS[event.type] ?? event.type;
}

function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export interface EventRailProps {
  events: TapeEvent[];
  fromAt: string;
  toAt: string;
}

export function EventRail({ events, fromAt, toAt }: EventRailProps) {
  const from = new Date(fromAt).getTime();
  const to = new Date(toAt).getTime();
  const span = to - from || 1;
  const visible = events
    .filter((event) => {
      const at = new Date(event.at).getTime();
      return Number.isFinite(at) && at >= from && at <= to;
    })
    .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());

  if (visible.length === 0) {
    return (
      <p className="mt-3 ml-11 mr-3 text-[10px] text-muted">
        No check-ins, alerts, training, or space weather in this range.
      </p>
    );
  }

  const types = Array.from(new Set(visible.map((event) => event.type)));

  return (
    <div className="mt-2">
      <div className="relative ml-11 mr-3 h-5" aria-hidden>
        <span className="absolute left-0 right-0 top-1/2 h-px bg-line" />
        {visible.map((event) => {
          const at = new Date(event.at).getTime();
          const position = clamp(((at - from) / span) * 100, 0, 100);
          return (
            <span
              key={event.id}
              title={`${eventLabel(event)}: ${event.label} · ${formatEventDate(event.at)}`}
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
              style={{ left: `${position}%`, backgroundColor: eventColor(event) }}
            />
          );
        })}
      </div>

      <div className="ml-11 mr-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
        {types.map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[type] ?? "#475569" }}
            />
            {EVENT_LABELS[type] ?? type}
          </span>
        ))}
        <span>Alerts use their severity color</span>
      </div>

      <details className="group mt-2">
        <summary className="ml-11 mr-3 flex cursor-pointer list-none items-center gap-1 text-[11px] text-ink-2 underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Events in this range ({visible.length})
          <ChevronDown
            size={12}
            className="transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ul className="ml-11 mr-3 mt-1 max-h-40 space-y-1 overflow-y-auto pr-1">
          {visible.map((event) => (
            <li key={event.id} className="flex items-start gap-2 text-[10px] leading-relaxed">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: eventColor(event) }}
              />
              <span className="min-w-0">
                <span className="tabular text-muted">{formatEventDate(event.at)}</span>
                {" · "}
                <span className="font-medium text-ink-2">{eventLabel(event)}</span>
                {" · "}
                <span className="text-ink-2">{event.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
