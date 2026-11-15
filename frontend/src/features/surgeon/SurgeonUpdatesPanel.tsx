import { ClipboardCheck, Sparkles, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import {
  useAcknowledgeSurgeonUpdate,
  useSurgeonUpdates,
} from "@/features/surgeon/queries";
import { formatRelativeTime } from "@/lib/utils";

const PROTOCOL_LABEL: Record<string, string> = {
  urgent_recheck: "Urgent recheck",
  cardiovascular_recheck: "Cardiovascular check",
  respiratory_recheck: "Respiratory check",
  vital_recheck: "Vital recheck",
  recovery_check: "Recovery check",
  mood_check: "Mood check",
  hydration_check: "Hydration check",
  training_check: "Training check",
};

const PROTOCOL_STEP: Record<string, string> = {
  urgent_recheck: "vitals",
  cardiovascular_recheck: "vitals",
  respiratory_recheck: "vitals",
  vital_recheck: "vitals",
  recovery_check: "sleep",
  mood_check: "mood",
  hydration_check: "training",
  training_check: "training",
};

export function SurgeonUpdatesPanel() {
  const navigate = useNavigate();
  const updatesQuery = useSurgeonUpdates();
  const acknowledge = useAcknowledgeSurgeonUpdate();
  const updates = updatesQuery.data;

  if (!updates || (updates.assessments.length === 0 && updates.instructions.length === 0)) {
    return null;
  }

  const latestAssessment = updates.assessments[0];
  const openInstructions = updates.instructions.filter(
    (instruction) => instruction.status === "open",
  );
  const topInstruction = openInstructions[0];
  const topStep = topInstruction ? PROTOCOL_STEP[topInstruction.protocol ?? ""] : null;

  const topSummary = topInstruction
    ? `${PROTOCOL_LABEL[topInstruction.protocol ?? ""] ?? "Follow-up"}${
        topInstruction.due_at ? ` · due ${formatRelativeTime(topInstruction.due_at)}` : ""
      }`
    : latestAssessment
      ? latestAssessment.working_diagnosis
      : "No open requests.";

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Stethoscope size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-ink">Flight Surgeon</p>
              {topInstruction?.source === "ai" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                  <Sparkles size={9} aria-hidden />
                  SI follow-up
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {topInstruction?.message ?? topSummary}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {topInstruction?.kind === "focused_check" && topStep && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                navigate(`/check-in?focus=${topStep}&request=${topInstruction.id}`)
              }
            >
              <ClipboardCheck size={12} aria-hidden />
              Start focused check
            </Button>
          )}
          {topInstruction?.kind === "request_checkin" && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/check-in")}>
              <ClipboardCheck size={12} aria-hidden />
              Open check-in
            </Button>
          )}
        </div>
      </div>

      <Disclosure
        className="mt-3 border-t border-line pt-2"
        summary="View assessment and requests"
        meta={`${updates.instructions.length} update${updates.instructions.length === 1 ? "" : "s"}`}
        summaryClassName="text-[10px] font-medium text-accent"
      >
        <div className="space-y-2.5">
          {latestAssessment && (
            <div className="rounded-lg border border-accent/20 bg-accent-soft/30 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Assessment · {formatRelativeTime(latestAssessment.created_at)} ·{" "}
                {latestAssessment.surgeon_name}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {latestAssessment.working_diagnosis}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
                {latestAssessment.plan}
              </p>
              {latestAssessment.follow_up && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Follow-up: {latestAssessment.follow_up}
                </p>
              )}
            </div>
          )}

          {openInstructions.map((instruction) => {
            const isSi = instruction.source === "ai";
            const step = PROTOCOL_STEP[instruction.protocol ?? ""];
            return (
              <div key={instruction.id} className="rounded-lg border border-line px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted">
                  {isSi && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium text-accent">
                      <Sparkles size={9} aria-hidden />
                      SI follow-up
                    </span>
                  )}
                  <span>
                    {PROTOCOL_LABEL[instruction.protocol ?? ""] ??
                      (instruction.kind === "request_checkin"
                        ? "Check-in requested"
                        : instruction.kind === "request_measurement"
                          ? "Measurement requested"
                          : "Note")}{" "}
                    · {formatRelativeTime(instruction.created_at)}
                  </span>
                  {instruction.due_at && (
                    <span>· due {formatRelativeTime(instruction.due_at)}</span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
                  {instruction.message}
                </p>
                {instruction.target_metrics.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted">
                    {instruction.target_metrics.length} focused reading
                    {instruction.target_metrics.length === 1 ? "" : "s"} requested
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {instruction.kind === "focused_check" && step && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(`/check-in?focus=${step}&request=${instruction.id}`)
                      }
                    >
                      <ClipboardCheck size={12} aria-hidden />
                      Start focused check
                    </Button>
                  )}
                  {instruction.kind === "request_checkin" && (
                    <Button variant="secondary" size="sm" onClick={() => navigate("/check-in")}>
                      <ClipboardCheck size={12} aria-hidden />
                      Open check-in
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      acknowledge.mutate(instruction.id, {
                        onSuccess: () => toast.success("Marked done."),
                        onError: (error) =>
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Unable to update the instruction.",
                          ),
                      })
                    }
                    disabled={acknowledge.isPending}
                  >
                    Mark done
                  </Button>
                </div>
              </div>
            );
          })}

          {openInstructions.length === 0 && (
            <p className="text-[11px] leading-relaxed text-muted">
              No open requests. Your latest assessment and check-ins are available to the surgeon.
            </p>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
