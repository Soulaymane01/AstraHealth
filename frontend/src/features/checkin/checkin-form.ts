import { z } from "zod";

import {
  CHECKIN_STEPS,
  type MetricField,
  type StepDefinition,
  type StepKey,
} from "@/features/checkin/checkin-config";

export const symptomDraftSchema = z.object({
  region: z.string().min(1),
  symptom: z.string().trim().min(1, "Choose a symptom.").max(80),
  severity: z.number().int().min(1).max(10),
  duration: z.string().max(40).nullable(),
});

export type SymptomDraft = z.infer<typeof symptomDraftSchema>;

export interface MetricMeta {
  source: "camera_rppg";
  confidence: number;
  [key: string]: unknown;
}

export interface CheckinFormState {
  metrics: Record<string, string>;
  metricsMeta: Record<string, MetricMeta>;
  symptoms: SymptomDraft[];
  notes: string;
}

export interface CheckinPayload {
  entries: { metric_code: string; value: number; meta?: MetricMeta }[];
  symptoms: SymptomDraft[];
  notes?: string;
  started_at: string;
  idempotency_key: string;
}

export function emptyForm(): CheckinFormState {
  return { metrics: {}, metricsMeta: {}, symptoms: [], notes: "" };
}

export function stepMetricFields(step: StepDefinition): MetricField[] {
  return [
    ...step.fields,
    ...step.scales.map((scale): MetricField => ({
      code: scale.code,
      label: scale.label,
      unit: "/5",
      min: 1,
      max: 5,
      step: 1,
    })),
  ];
}

function metricValueSchema(field: MetricField) {
  return z
    .string()
    .default("")
    .refine((raw) => {
      const trimmed = raw.trim();
      if (trimmed === "") return true;
      const value = Number(trimmed);
      if (!Number.isFinite(value)) return false;
      return value >= field.min && value <= field.max;
    }, `Enter a value between ${field.min} and ${field.max} ${field.unit}.`);
}

export function validateStep(
  step: StepDefinition,
  metrics: Record<string, string>,
): Record<string, string> {
  const shape = Object.fromEntries(
    stepMetricFields(step).map((field) => [field.code, metricValueSchema(field)]),
  );
  const parsed = z.object(shape).safeParse(metrics);
  if (parsed.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function validateNotes(notes: string): string | null {
  if (notes.length <= 2000) return null;
  return "Notes must be 2,000 characters or fewer.";
}

export function hasStepData(
  step: StepDefinition,
  metrics: Record<string, string>,
  symptoms: SymptomDraft[],
): boolean {
  if (step.key === "symptoms") return symptoms.length > 0;
  return stepMetricFields(step).some((field) => (metrics[field.code] ?? "").trim() !== "");
}

export function countStepValues(
  step: StepDefinition,
  metrics: Record<string, string>,
  symptoms: SymptomDraft[],
): number {
  if (step.key === "symptoms") return symptoms.length;
  return stepMetricFields(step).filter((field) => (metrics[field.code] ?? "").trim() !== "").length;
}

export function hasDraftContent(form: CheckinFormState, skipped: StepKey[]): boolean {
  const hasMetric = Object.values(form.metrics).some((value) => value.trim() !== "");
  return hasMetric || form.symptoms.length > 0 || form.notes.trim() !== "" || skipped.length > 0;
}

export function buildCheckinPayload(
  form: CheckinFormState,
  skipped: StepKey[],
  startedAt: string,
  idempotencyKey: string,
): CheckinPayload {
  const entries: CheckinPayload["entries"] = [];

  for (const step of CHECKIN_STEPS) {
    if (skipped.includes(step.key)) continue;
    for (const field of stepMetricFields(step)) {
      const raw = (form.metrics[field.code] ?? "").trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (Number.isFinite(value)) {
        const meta = form.metricsMeta[field.code];
        entries.push(
          meta ? { metric_code: field.code, value, meta } : { metric_code: field.code, value },
        );
      }
    }
  }

  const symptoms = skipped.includes("symptoms") ? [] : form.symptoms;
  if (!skipped.includes("symptoms") && form.symptoms.length === 0) {
    entries.push({ metric_code: "symptom_score", value: 0 });
  }

  const noteParts: string[] = [];
  const skippedTitles = CHECKIN_STEPS.filter((step) => skipped.includes(step.key)).map(
    (step) => step.title,
  );
  if (skippedTitles.length > 0) {
    noteParts.push(`Skipped: ${skippedTitles.join(", ")}.`);
  }
  if (form.notes.trim() !== "") {
    noteParts.push(form.notes.trim());
  }

  return {
    entries,
    symptoms,
    notes: noteParts.length > 0 ? noteParts.join("\n").slice(0, 2000) : undefined,
    started_at: startedAt,
    idempotency_key: idempotencyKey,
  };
}
