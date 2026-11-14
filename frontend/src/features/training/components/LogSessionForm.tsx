import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { Spinner } from "@/components/ui/Spinner";
import { useLogTrainingSession } from "@/features/training/queries";
import type { TrainingPlanItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function LogSessionForm({ item, onClose }: { item: TrainingPlanItem; onClose: () => void }) {
  const logSession = useLogTrainingSession();
  const [duration, setDuration] = useState(String(item.duration_min));
  const [rpe, setRpe] = useState(5);

  const durationValue = Number(duration);
  const valid = Number.isFinite(durationValue) && durationValue >= 1 && durationValue <= 300;

  const submit = () => {
    if (!valid) return;
    logSession.mutate(
      {
        item_code: item.code,
        duration_min: Math.round(durationValue),
        rpe,
      },
      {
        onSuccess: (result) => {
          toast.success(`Session logged. +${result.credits_awarded} MP.`);
          if (result.new_achievements.length > 0) {
            toast.success(
              `Achievement unlocked: ${result.new_achievements
                .map((achievement) => achievement.name)
                .join(", ")}`,
            );
          }
          onClose();
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Unable to log the training session.",
          );
        },
      },
    );
  };

  return (
    <Panel
      className="mt-4 border-accent/25"
      title={`Log ${item.name}`}
      subtitle={`${item.domain} · ${item.duration_min} min planned`}
      actions={
        <button
          type="button"
          onClick={onClose}
          aria-label="Close session form"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
        >
          <X size={14} aria-hidden />
        </button>
      }
    >
      {item.countermeasure_for.length > 0 && (
        <div className="mb-3 rounded-lg bg-watch-soft px-3 py-2 text-[11px] leading-relaxed text-watch">
          Countermeasure for: {item.countermeasure_for.join(", ")}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Duration (minutes)" htmlFor="training-duration">
          <Input
            id="training-duration"
            type="number"
            min={1}
            max={300}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            invalid={!valid}
          />
        </Field>
        <div>
          <p className="text-xs font-medium text-ink-2">Perceived exertion</p>
          <div
            className="mt-1.5 grid grid-cols-5 gap-1"
            role="group"
            aria-label="Perceived exertion"
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rpe === value}
                onClick={() => setRpe(value)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md border text-[11px] tabular transition-colors",
                  rpe === value
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>Easy</span>
            <span>Maximal</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[10px] text-muted">+30 mission points on save</span>
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!valid || logSession.isPending}
        >
          {logSession.isPending ? (
            <Spinner className="text-white" />
          ) : (
            <Check size={12} aria-hidden />
          )}
          Save session
        </Button>
      </div>
    </Panel>
  );
}
