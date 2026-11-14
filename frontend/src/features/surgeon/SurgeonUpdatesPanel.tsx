import { ClipboardCheck, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  useAcknowledgeSurgeonUpdate,
  useSurgeonUpdates,
} from "@/features/surgeon/queries";
import { formatRelativeTime } from "@/lib/utils";

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

  return (
    <Panel
      className="mt-4 border-accent/25"
      title="Flight Surgeon"
      subtitle="Earth-side clinical guidance."
      actions={
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
          <Stethoscope size={9} aria-hidden />
          Surgeon
        </span>
      }
    >
      <div className="space-y-3">
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

        {openInstructions.map((instruction) => (
          <div key={instruction.id} className="rounded-lg border border-line px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              {instruction.kind === "request_checkin"
                ? "Check-in requested"
                : instruction.kind === "request_measurement"
                  ? "Measurement requested"
                  : "Note"}{" "}
              · {formatRelativeTime(instruction.created_at)}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
              {instruction.message}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
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
        ))}

        {openInstructions.length === 0 && (
          <p className="text-[11px] leading-relaxed text-muted">
            No open requests. Your latest assessment and check-ins are available to the surgeon.
          </p>
        )}
      </div>
    </Panel>
  );
}
