import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  SYMPTOM_DURATIONS,
  SYMPTOM_OPTIONS,
  SYMPTOM_REGIONS,
  type SymptomRegion,
} from "@/features/checkin/checkin-config";
import { symptomDraftSchema, type SymptomDraft } from "@/features/checkin/checkin-form";
import { SymptomBodyMap } from "@/features/checkin/components/SymptomBodyMap";
import { cn } from "@/lib/utils";

export interface SymptomStepProps {
  symptoms: SymptomDraft[];
  onChange: (symptoms: SymptomDraft[]) => void;
  onNoSymptoms: () => void;
}

export function SymptomStep({ symptoms, onChange, onNoSymptoms }: SymptomStepProps) {
  const [selectedRegion, setSelectedRegion] = useState<SymptomRegion>("head");
  const [symptom, setSymptom] = useState("");
  const [custom, setCustom] = useState("");
  const [severity, setSeverity] = useState(3);
  const [duration, setDuration] = useState(SYMPTOM_DURATIONS[0]);
  const [error, setError] = useState<string | null>(null);

  const options = SYMPTOM_OPTIONS[selectedRegion].includes("Other")
    ? SYMPTOM_OPTIONS[selectedRegion]
    : [...SYMPTOM_OPTIONS[selectedRegion], "Other"];
  const regionLabel =
    SYMPTOM_REGIONS.find((region) => region.id === selectedRegion)?.label ?? selectedRegion;

  const reportedRegions = new Set<SymptomRegion>(
    symptoms
      .map((entry) => entry.region)
      .filter((region): region is SymptomRegion =>
        SYMPTOM_REGIONS.some((definition) => definition.id === region),
      ),
  );

  const selectRegion = (region: SymptomRegion) => {
    setSelectedRegion(region);
    setSymptom("");
    setCustom("");
    setError(null);
  };

  const addSymptom = () => {
    const symptomText = symptom === "Other" ? custom.trim() : symptom;
    const parsed = symptomDraftSchema.safeParse({
      region: selectedRegion,
      symptom: symptomText,
      severity,
      duration,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a symptom first.");
      return;
    }

    const remaining = symptoms.filter(
      (entry) =>
        !(
          entry.region === parsed.data.region &&
          entry.symptom.toLowerCase() === parsed.data.symptom.toLowerCase()
        ),
    );
    onChange([...remaining, parsed.data]);
    setSymptom("");
    setCustom("");
    setSeverity(3);
    setDuration(SYMPTOM_DURATIONS[0]);
    setError(null);
  };

  const removeSymptom = (index: number) => {
    onChange(symptoms.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <div className="mt-4">
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SymptomBodyMap
            selectedRegion={selectedRegion}
            reportedRegions={reportedRegions}
            onSelectRegion={selectRegion}
          />
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-ink">Add a symptom in {regionLabel}</p>
              <span className="text-[10px] uppercase tracking-wide text-muted">One at a time</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={symptom === option}
                  onClick={() => {
                    setSymptom(option);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    symptom === option
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            {symptom === "Other" && (
              <input
                value={custom}
                onChange={(event) => {
                  setCustom(event.target.value);
                  setError(null);
                }}
                maxLength={80}
                placeholder="Describe the symptom"
                aria-label="Describe the symptom"
                className="mt-2 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted/70 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
              />
            )}

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted">Severity</p>
                <p className="text-[10px] tabular text-muted">{severity}/10</p>
              </div>
              <div
                className="mt-1.5 grid grid-cols-5 gap-1 sm:grid-cols-10"
                role="group"
                aria-label="Symptom severity"
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={severity === value}
                    onClick={() => setSeverity(value)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md border text-[11px] tabular transition-colors",
                      severity === value
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-surface text-ink-2 hover:border-line-strong",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>Mild</span>
                <span>Severe</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-medium text-muted">Duration</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SYMPTOM_DURATIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={duration === option}
                    onClick={() => setDuration(option)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      duration === option
                        ? "border-accent/30 bg-accent-soft text-accent"
                        : "border-line bg-surface text-ink-2 hover:border-line-strong",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mt-2 text-[11px] text-critical">{error}</p>}

            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={addSymptom}>
              <Plus size={13} aria-hidden />
              Add symptom
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted">Logged symptoms</p>
          {symptoms.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {symptoms.map((entry, index) => {
                const label =
                  SYMPTOM_REGIONS.find((region) => region.id === entry.region)?.label ??
                  entry.region;
                return (
                  <li
                    key={`${entry.region}-${entry.symptom}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{entry.symptom}</p>
                      <p className="truncate text-[10px] text-muted">
                        {label} · {entry.duration ?? "Duration not set"} · severity {entry.severity}
                        /10
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSymptom(index)}
                      aria-label={`Remove ${entry.symptom}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1.5 rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
              No symptoms logged yet.
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={onNoSymptoms}
        >
          <CheckCircle2 size={13} aria-hidden />
          No symptoms today
        </Button>
      </div>
    </div>
  );
}
