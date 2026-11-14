import { Check, ClipboardCheck, Droplets, Dumbbell, Moon, Plus } from "lucide-react";

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
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2",
        next ? "border-watch/30 bg-watch-soft" : "border-line bg-surface",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          STATUS_CLASSES[item.status],
        )}
      >
        {item.status === "done" ? <Check size={13} aria-hidden /> : <Icon size={13} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-ink">{item.title}</p>
        <p className="text-[10px] tabular text-muted">{item.time}</p>
      </div>
      {checkinAction ? (
        <button
          type="button"
          onClick={onCheckin}
          className="shrink-0 rounded-full bg-surface px-2 py-1 text-[9px] font-semibold text-accent"
        >
          Open
        </button>
      ) : actionable ? (
        <button
          type="button"
          onClick={() => item.training_code && onLog(item.training_code)}
          aria-label={`Log ${item.title}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-accent"
        >
          <Plus size={12} aria-hidden />
        </button>
      ) : item.status === "done" ? (
        <span className="shrink-0 text-[9px] font-medium text-nominal">Done</span>
      ) : (
        <span className="shrink-0 text-[9px] text-muted">{item.status}</span>
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
  const progress = roster.total > 0 ? Math.round((roster.completed / roster.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-nominal transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular text-ink-2">
          {roster.completed}/{roster.total}
        </span>
      </div>

      <ol className="mt-3 space-y-2">
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
        <p className="mt-3 text-[10px] text-muted">
          Next: <span className="font-semibold text-ink">{nextDue.title}</span> ·{" "}
          <span className="tabular">{nextDue.time}</span>
        </p>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-nominal">
          <Check size={11} aria-hidden />
          All scheduled items complete
        </p>
      )}
    </div>
  );
}
