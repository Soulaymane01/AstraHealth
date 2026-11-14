import { useReducedMotion } from "motion/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricSeries, TapeEvent } from "@/lib/api/types";
import { asStatus, STATUS_META } from "@/lib/status";
import { displayMetricValue } from "@/lib/utils";

import type { BandMode } from "@/features/telemetry/telemetry-config";

export interface MetricChartProps {
  series: MetricSeries;
  band: BandMode;
  events: TapeEvent[];
}

function formatAxisDate(value: number, days: number): string {
  return new Intl.DateTimeFormat(
    "en-US",
    days <= 7 ? { weekday: "short" } : { month: "short", day: "numeric" },
  ).format(new Date(value));
}

function formatTooltipDate(value: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function eventColor(event: TapeEvent): string {
  if (event.type === "alert") {
    return STATUS_META[asStatus(event.status ?? "unknown")].hex;
  }
  if (event.type === "weather") return "#92400E";
  if (event.type === "training") return "#036B53";
  return "#0B3D91";
}

function inWindow(event: TapeEvent, from: number, to: number): boolean {
  const at = new Date(event.at).getTime();
  return Number.isFinite(at) && at >= from && at <= to;
}

export function MetricChart({ series, band, events }: MetricChartProps) {
  const reduce = useReducedMotion();
  const status = asStatus(series.status);
  const lineColor = status === "unknown" ? "#0B3D91" : STATUS_META[status].hex;

  const data = series.points
    .map((point) => ({
      t: new Date(point.measured_at).getTime(),
      value: point.value,
      source: point.source,
    }))
    .sort((left, right) => left.t - right.t);

  const from = new Date(series.from_at).getTime();
  const to = new Date(series.to_at).getTime();
  const visibleEvents = events.filter((event) => inWindow(event, from, to));

  const values = data.map((point) => point.value);
  if (band === "baseline" && series.baseline) {
    values.push(series.baseline.lower, series.baseline.upper);
  }
  if (band === "reference") {
    if (series.reference.lower !== null) values.push(series.reference.lower);
    if (series.reference.upper !== null) values.push(series.reference.upper);
  }

  const rawMin = values.length > 0 ? Math.min(...values) : 0;
  const rawMax = values.length > 0 ? Math.max(...values) : 1;
  const span = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const pad = span * 0.12;
  const lowerBound = Math.floor((rawMin - pad) * 10) / 10;
  const upperBound = Math.ceil((rawMax + pad) * 10) / 10;
  const yDomain: [number, number] = [rawMin >= 0 && lowerBound < 0 ? 0 : lowerBound, upperBound];

  const checkinLines = visibleEvents.filter((event) => event.type === "checkin").slice(-12);
  const trainingLines = visibleEvents.filter((event) => event.type === "training").slice(-12);
  const alertLines = visibleEvents.filter((event) => event.type === "alert").slice(-6);
  const weatherLines = visibleEvents.filter((event) => event.type === "weather").slice(-4);

  const referenceLower = series.reference.lower ?? yDomain[0];
  const referenceUpper = series.reference.upper ?? yDomain[1];

  return (
    <div className="mt-2 w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {band === "baseline" && series.baseline && (
            <ReferenceArea
              y1={series.baseline.lower}
              y2={series.baseline.upper}
              fill="#0B3D91"
              fillOpacity={0.08}
              stroke="#0B3D91"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
          )}
          {band === "reference" &&
            (series.reference.lower !== null || series.reference.upper !== null) && (
              <ReferenceArea
                y1={referenceLower}
                y2={referenceUpper}
                fill="#475569"
                fillOpacity={0.08}
                stroke="#475569"
                strokeOpacity={0.25}
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            )}

          <CartesianGrid vertical={false} stroke="#E2E8EF" strokeDasharray="3 3" />

          {checkinLines.map((event) => (
            <ReferenceLine
              key={event.id}
              x={new Date(event.at).getTime()}
              stroke="#0B3D91"
              strokeOpacity={0.14}
              strokeDasharray="3 5"
            />
          ))}
          {trainingLines.map((event) => (
            <ReferenceLine
              key={event.id}
              x={new Date(event.at).getTime()}
              stroke="#036B53"
              strokeOpacity={0.12}
              strokeDasharray="2 6"
            />
          ))}
          {alertLines.map((event) => (
            <ReferenceLine
              key={event.id}
              x={new Date(event.at).getTime()}
              stroke={eventColor(event)}
              strokeOpacity={0.45}
              strokeDasharray="2 4"
            />
          ))}
          {weatherLines.map((event) => (
            <ReferenceLine
              key={event.id}
              x={new Date(event.at).getTime()}
              stroke="#92400E"
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
          ))}
          {band === "baseline" && series.baseline && (
            <ReferenceLine
              y={series.baseline.center}
              stroke="#0B3D91"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
          )}

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[from, to]}
            tickFormatter={(value) => formatAxisDate(Number(value), series.range_days)}
            tick={{ fill: "#5F6F82", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8EF" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            width={44}
            domain={yDomain}
            tickFormatter={(value) => displayMetricValue(Number(value))}
            tick={{ fill: "#5F6F82", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [
              `${displayMetricValue(Number(value))} ${series.metric.unit}`,
              series.metric.name,
            ]}
            labelFormatter={(label) => formatTooltipDate(Number(label))}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E2E8EF",
              background: "#FFFFFF",
              fontSize: "12px",
              boxShadow: "0 8px 24px rgba(15, 27, 45, 0.08)",
            }}
            labelStyle={{ color: "#526175", fontSize: "11px", marginBottom: "2px" }}
            itemStyle={{ color: "#0F1B2D" }}
            cursor={{ stroke: "#CBD5E1", strokeDasharray: "3 3" }}
          />
          <Line
            type="linear"
            dataKey="value"
            name={series.metric.name}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#FFFFFF", stroke: lineColor, strokeWidth: 1.5 }}
            activeDot={{ r: 4, fill: lineColor, stroke: "#FFFFFF", strokeWidth: 2 }}
            isAnimationActive={!reduce}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
