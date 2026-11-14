import { ClipboardCheck, Droplets, Dumbbell, Moon, Plus } from "lucide-react";

import type { TrainingRoster, TrainingRosterItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const KIND_ICONS = {
  checkin: ClipboardCheck,
  training: Dumbbell,
  hydration: Droplets,
  sleep: Moon,
};

const STATUS_CLASSES = {
  done: "bg-nominal-soft text-nominal",
  due: "bg-watch-soft text-watch",
  upcoming: "bg-surface-muted text-muted",
};

const PROFILE_LABELS: Record<string, string> = {
  mars_transit: "Mars transit",
  lunar_surface: "Lunar surface",
  station: "Space station",
};

function RosterRow({
  item,
  next,
  onLog,
  onCheckin,
}: {
  item: TrainingRosterItem;
  next: boolean;
  onLog: (code: string) => void;
  onCheckin: () => void;
}) {
  const Icon = KIND_ICONS[item.kind];
  const actionable = item.status !== "done" && Boolean(item.training_code);
  const checkinAction = item.kind === "checkin" && item.status !== "done";

  return (
    <li className={cn("relative rounded-lg px-2 py-1.5", next && "bg-accent-soft/40")}>
      <span className="absolute -left-[30px] top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-muted ring-4 ring-surface">
        <Icon size={12} aria-hidden />
      </span>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink">
            <span className="mr-1.5 tabular text-muted">{item.time}</span>
            {item.title}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{item.detail}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium capitalize",
            STATUS_CLASSES[item.status],
          )}
        >
          {item.status}
        </span>
      </div>
      {(actionable || checkinAction) && (
        <div className="mt-1.5 flex justify-end">
          {checkinAction ? (
            <button
              type="button"
              onClick={onCheckin}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
            >
              Open check-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => item.training_code && onLog(item.training_code)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
            >
              <Plus size={10} aria-hidden />
              Log
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function DutyRoster({
  roster,
  onLog,
  onCheckin,
}: {
  roster: TrainingRoster;
  onLog: (code: string) => void;
  onCheckin: () => void;
}) {
  const nextDue = roster.next_due;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          {roster.completed} of {roster.total} done
        </span>
        <span>
          {PROFILE_LABELS[roster.profile] ?? roster.profile.replace("_", " ")}
          {roster.profile_assigned ? "" : " · default"}
        </span>
      </div>
      <ol className="mt-3 space-y-2 border-l border-line pl-6">
        {roster.items.map((item) => (
          <RosterRow
            key={`${item.time}-${item.kind}`}
            item={item}
            next={nextDue?.time === item.time && nextDue?.kind === item.kind}
            onLog={onLog}
            onCheckin={onCheckin}
          />
        ))}
      </ol>
      {nextDue ? (
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-[10px] text-muted">
          Next due: <span className="font-medium text-ink">{nextDue.title}</span> at{" "}
          <span className="tabular">{nextDue.time}</span>.
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-nominal-soft px-3 py-2 text-[10px] text-nominal">
          All scheduled items are complete.
        </p>
      )}
    </div>
  );
}
