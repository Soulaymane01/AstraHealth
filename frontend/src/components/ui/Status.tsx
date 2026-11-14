import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", meta.dot, className)}
    />
  );
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.text, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {label ?? meta.label}
    </span>
  );
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.bg,
        meta.text,
        meta.border,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2} aria-hidden />
      {label ?? meta.label}
    </span>
  );
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {(["nominal", "watch", "caution", "critical", "unknown"] as Status[]).map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <StatusDot status={status} />
          {STATUS_META[status].label}
        </span>
      ))}
    </div>
  );
}
