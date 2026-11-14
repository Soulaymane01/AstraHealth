export const TELEMETRY_RANGES = [7, 30, 90] as const;

export type RangeDays = (typeof TELEMETRY_RANGES)[number];

export type BandMode = "baseline" | "reference";

export interface TelemetryDomain {
  key: string;
  label: string;
  description: string;
}

export const TELEMETRY_DOMAINS: TelemetryDomain[] = [
  {
    key: "cardiovascular",
    label: "Cardiovascular",
    description: "Heart rate, HRV, blood pressure, and orthostatic tolerance.",
  },
  {
    key: "musculoskeletal",
    label: "Musculoskeletal",
    description: "Strength, loading, bone load, and body mass.",
  },
  {
    key: "sleep",
    label: "Sleep & circadian",
    description: "Duration, efficiency, and how long it takes to fall asleep.",
  },
  {
    key: "neurobehavioral",
    label: "Neurobehavioral",
    description: "Mood, stress, reaction time, and crew contact.",
  },
  {
    key: "metabolic",
    label: "Metabolic & nutrition",
    description: "Glucose, hydration, energy intake, and vitamin D.",
  },
  {
    key: "immune",
    label: "Immune & sensory",
    description: "Temperature, oxygen saturation, symptom load, and vision.",
  },
];

export function domainMetaForLabel(label: string): TelemetryDomain | undefined {
  return TELEMETRY_DOMAINS.find((domain) => domain.label === label);
}

export function domainPath(domain: string, days?: RangeDays): string {
  return `/telemetry/domain/${domain}${days ? `?days=${days}` : ""}`;
}

export function metricPath(code: string, days?: RangeDays): string {
  return `/telemetry/metric/${code}${days ? `?days=${days}` : ""}`;
}

export function parseRange(value: string | null): RangeDays {
  const parsed = Number(value);
  return parsed === 7 || parsed === 30 || parsed === 90 ? parsed : 30;
}

export function parseBand(value: string | null): BandMode {
  return value === "reference" ? "reference" : "baseline";
}

export function frequencyLabel(frequency: string): string {
  if (frequency === "daily") return "Daily";
  if (frequency === "every_3_days") return "Every 3 days";
  if (frequency === "weekly") return "Weekly";
  return frequency.replace("_", " ");
}

export function sourceLabel(source: string): string {
  if (source === "manual") return "Manual";
  if (source === "device") return "Device";
  if (source === "camera_rppg") return "Camera";
  if (source === "derived") return "Derived";
  return source;
}

export function rangeLabel(days: RangeDays): string {
  return `${days} days`;
}
