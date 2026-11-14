import { useId } from "react";

import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface SparklineProps {
  values: number[];
  status?: Status;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  values,
  status = "unknown",
  width = 96,
  height = 24,
  fill = false,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const meta = STATUS_META[status];

  if (values.length === 0) {
    return (
      <div
        className={cn("rounded border border-dashed border-line", className)}
        style={{ width, height }}
        aria-hidden
      />
    );
  }

  const series = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const pad = 2;

  const points = series.map((value, index) => {
    const x = pad + (index / (series.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${(width - pad).toFixed(2)},${height} L${pad},${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.hex} stopOpacity={0.12} />
              <stop offset="100%" stopColor={meta.hex} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={meta.hex}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={1.6} fill={meta.hex} />}
    </svg>
  );
}
