import { useEffect, useState } from "react";

import { cn, formatMet } from "@/lib/utils";

export interface MetClockProps {
  startAt: number | Date | string;
  className?: string;
}

/** Mission Elapsed Time, ticking once per second. */
export function MetClock({ startAt, className }: MetClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const start = new Date(startAt).getTime();
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5",
        className,
      )}
    >
      <span className="text-[10px] font-medium text-muted">MET</span>
      <span className="tabular font-mono text-xs text-ink">{formatMet(elapsed)}</span>
    </span>
  );
}
