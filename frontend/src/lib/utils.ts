import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Signed number with a true minus sign, e.g. "+3", "−2.4". */
export function formatSigned(value: number, decimals = 0): string {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${formatNumber(Math.abs(value), decimals)}`;
}

/** Mission Elapsed Time as DDD:HH:MM:SS. */
export function formatMet(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [days, hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/** Turn a metric code into a readable label: hrv_rmssd -> HRV RMSSD. */
export function metricLabel(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string): string {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatCommsDelay(minutes: number): string {
  if (minutes <= 0) return "Live link";
  if (minutes < 1) return `${Math.round(minutes * 60)} s delay`;
  if (minutes < 60) return `${Math.round(minutes)} min delay`;
  return `${(minutes / 60).toFixed(1)} h delay`;
}

export function formatRelativeTime(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function displayMetricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

