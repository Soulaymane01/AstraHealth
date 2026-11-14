import { motion, useReducedMotion } from "motion/react";

import { StatusBadge } from "@/components/ui/Status";
import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

import { TelemetryNumber } from "./TelemetryNumber";

export interface ReadinessRingProps {
  score: number;
  status: Status;
  size?: number;
  strokeWidth?: number;
  factors?: number;
  className?: string;
  label?: string;
}

export function ReadinessRing({
  score,
  status,
  size = 180,
  strokeWidth = 8,
  factors,
  className,
  label = "Readiness",
}: ReadinessRingProps) {
  const reduce = useReducedMotion();
  const meta = STATUS_META[status];
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - progress);
  const arcColor = status === "critical" ? meta.hex : "var(--color-accent)";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${label} ${score} out of 100, ${meta.label}.`}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-muted">{label}</span>
          <TelemetryNumber
            value={score}
            className="mt-1 font-sans text-[2.75rem] font-semibold leading-none tracking-tight text-ink"
          />
          <StatusBadge status={status} className="mt-2" />
        </div>
      </div>

      {factors !== undefined && (
        <p className="mt-2 text-xs text-muted">
          {factors} contributing factor{factors === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
