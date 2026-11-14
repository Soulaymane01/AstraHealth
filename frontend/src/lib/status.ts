import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Eye,
  type LucideIcon,
} from "lucide-react";

export type Status = "nominal" | "watch" | "caution" | "critical" | "unknown";

export interface StatusMeta {
  label: string;
  description: string;
  /** Raw hex for SVG strokes and fills. */
  hex: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  icon: LucideIcon;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  nominal: {
    label: "Nominal",
    description: "Within your baseline",
    hex: "#15803D",
    text: "text-nominal",
    bg: "bg-nominal-soft",
    border: "border-nominal/20",
    dot: "bg-nominal",
    icon: CheckCircle2,
  },
  watch: {
    label: "Watch",
    description: "Slightly outside baseline",
    hex: "#B45309",
    text: "text-watch",
    bg: "bg-watch-soft",
    border: "border-watch/20",
    dot: "bg-watch",
    icon: Eye,
  },
  caution: {
    label: "Caution",
    description: "Action recommended",
    hex: "#C2410C",
    text: "text-caution",
    bg: "bg-caution-soft",
    border: "border-caution/20",
    dot: "bg-caution",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    description: "Contact the flight surgeon",
    hex: "#B91C1C",
    text: "text-critical",
    bg: "bg-critical-soft",
    border: "border-critical/20",
    dot: "bg-critical",
    icon: AlertOctagon,
  },
  unknown: {
    label: "No data",
    description: "Not enough measurements",
    hex: "#55657A",
    text: "text-unknown",
    bg: "bg-unknown-soft",
    border: "border-unknown/20",
    dot: "bg-unknown",
    icon: CircleHelp,
  },
};

export const STATUS_ORDER: Status[] = ["nominal", "watch", "caution", "critical", "unknown"];

export function statusFromScore(score: number): Status {
  if (score >= 85) return "nominal";
  if (score >= 70) return "watch";
  if (score >= 50) return "caution";
  return "critical";
}

export function asStatus(value: string): Status {
  return STATUS_ORDER.includes(value as Status) ? (value as Status) : "unknown";
}
