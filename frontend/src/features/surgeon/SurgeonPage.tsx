import {
  ClipboardList,
  LogOut,
  RefreshCw,
  Send,
  Stethoscope,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusPill } from "@/components/ui/Status";
import { useAuthStore } from "@/features/auth/auth-store";
import { MetricChart } from "@/features/telemetry/components/MetricChart";
import { sourceLabel } from "@/features/telemetry/telemetry-config";
import { useMetricDefinitions } from "@/features/telemetry/queries";
import {
  useAcknowledgeCrewAlert,
  useCreateAssessment,
  useCreateInstruction,
  useSimulateCrewCapture,
  useSurgeonCrew,
  useSurgeonDetail,
  useSurgeonSeries,
} from "@/features/surgeon/queries";
import type {
  SurgeonAssessment,
  SurgeonCrewSummary,
  SurgeonInstruction,
  TapeEvent,
} from "@/lib/api/types";
import { asStatus } from "@/lib/status";
import { cn, displayMetricValue, formatRelativeTime, initials, titleCase } from "@/lib/utils";

type TabKey = "overview" | "trends" | "captures" | "clinical";
type Days = 7 | 30 | 90;

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trends", label: "Trends" },
  { key: "captures", label: "Captures" },
  { key: "clinical", label: "Clinical record" },
];

const NO_EVENTS: TapeEvent[] = [];

const DOMAIN_LABELS: Record<string, string> = {
  cardiovascular: "Cardiovascular",
  musculoskeletal: "Musculoskeletal",
  sleep: "Sleep & circadian",
  neurobehavioral: "Neurobehavioral",
  metabolic: "Metabolic & nutrition",
  immune: "Immune & sensory",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPublished(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AssessmentCard({ assessment }: { assessment: SurgeonAssessment }) {
  return (
    <article className="rounded-lg border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">
            {formatPublished(assessment.created_at)} · {assessment.surgeon_name}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-ink">
            {assessment.working_diagnosis}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            assessment.share_with_crew
              ? "bg-accent-soft text-accent"
              : "bg-surface-muted text-muted",
          )}
        >
          {assessment.share_with_crew ? "Shared with crew" : "Surgeon only"}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{assessment.findings}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink">
        <span className="font-medium">Plan:</span> {assessment.plan}
      </p>
      {assessment.follow_up && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Follow-up: {assessment.follow_up}
        </p>
      )}
    </article>
  );
}

function InstructionCard({
  instruction,
  onAck,
}: {
  instruction: SurgeonInstruction;
  onAck?: () => void;
}) {
  const kindLabel =
    instruction.kind === "request_checkin"
      ? "Check-in requested"
      : instruction.kind === "request_measurement"
        ? "Measurement requested"
        : "Note";
  return (
    <article className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted">{kindLabel}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            instruction.status === "open"
              ? "bg-watch-soft text-watch"
              : "bg-nominal-soft text-nominal",
          )}
        >
          {instruction.status}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{instruction.message}</p>
      <p className="mt-1 text-[10px] text-muted">
        {instruction.surgeon_name} · {formatPublished(instruction.created_at)}
      </p>
      {onAck && instruction.status === "open" && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onAck}>
          Mark done
        </Button>
      )}
    </article>
  );
}

export function SurgeonPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const crewQuery = useSurgeonCrew();
  const metricsQuery = useMetricDefinitions();
  const crew = crewQuery.data ?? [];
  const requestedId = Number(searchParams.get("crew"));
  const activeId = crew.some((member) => member.id === requestedId)
    ? requestedId
    : crew[0]?.id;
  const detailQuery = useSurgeonDetail(activeId);

  const [tab, setTab] = useState<TabKey>("overview");
  const [metricCode, setMetricCode] = useState("hrv_rmssd");
  const [days, setDays] = useState<Days>(30);
  const [captureFilter, setCaptureFilter] = useState<"all" | "capture" | "manual">("all");
  const [diagnosis, setDiagnosis] = useState("");
  const [findings, setFindings] = useState("");
  const [plan, setPlan] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [shareWithCrew, setShareWithCrew] = useState(true);
  const [instructionKind, setInstructionKind] = useState<
    "note" | "request_checkin" | "request_measurement"
  >("note");
  const [instructionMessage, setInstructionMessage] = useState("");

  const seriesQuery = useSurgeonSeries(activeId, metricCode, days);
  const createAssessment = useCreateAssessment(activeId ?? 0);
  const createInstruction = useCreateInstruction(activeId ?? 0);
  const acknowledgeAlert = useAcknowledgeCrewAlert(activeId ?? 0);
  const simulateCapture = useSimulateCrewCapture(activeId ?? 0);

  const metrics = metricsQuery.data ?? [];
  const metricMap = useMemo(
    () => new Map(metrics.map((metric) => [metric.code, metric])),
    [metrics],
  );

  const selectCrew = (member: SurgeonCrewSummary) => {
    setSearchParams({ crew: String(member.id) });
    setTab("overview");
  };

  const signOut = () => {
    logout();
    navigate("/login");
  };

  if (crewQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (crewQuery.isError) {
    return (
      <QueryError
        title="Surgeon console unavailable"
        message="The crew roster could not be loaded."
        onRetry={() => void crewQuery.refetch()}
        retrying={crewQuery.isFetching}
      />
    );
  }

  const detail = detailQuery.data;
  const member = detail?.member;
  const readiness = detail?.readiness;
  const status = readiness ? asStatus(readiness.status) : null;
  const activeAlerts = (detail?.alerts ?? []).filter((alert) => alert.status === "active");
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === "critical");
  const latestAssessment = detail?.assessments[0];
  const filteredMeasurements = (detail?.measurements ?? []).filter((measurement) => {
    if (captureFilter === "capture") {
      return measurement.source.endsWith("_capture");
    }
    if (captureFilter === "manual") {
      return measurement.source === "manual" || measurement.source === "camera_rppg";
    }
    return true;
  });

  const submitAssessment = () => {
    if (!diagnosis.trim() || !findings.trim() || !plan.trim()) {
      toast.error("Add a diagnosis, findings, and plan before saving.");
      return;
    }
    createAssessment.mutate(
      {
        working_diagnosis: diagnosis.trim(),
        findings: findings.trim(),
        plan: plan.trim(),
        follow_up: followUp.trim() || null,
        share_with_crew: shareWithCrew,
      },
      {
        onSuccess: () => {
          toast.success("Clinical assessment saved.");
          setDiagnosis("");
          setFindings("");
          setPlan("");
          setFollowUp("");
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Unable to save the assessment."),
      },
    );
  };

  const sendInstruction = (kind = instructionKind, message = instructionMessage) => {
    if (!message.trim()) {
      toast.error("Add a message before sending.");
      return;
    }
    createInstruction.mutate(
      { kind, message: message.trim() },
      {
        onSuccess: () => {
          toast.success("Sent to the crew member.");
          setInstructionMessage("");
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Unable to send the instruction."),
      },
    );
  };

  const quickRequest = (kind: "request_checkin" | "request_measurement") => {
    sendInstruction(
      kind,
      kind === "request_checkin"
        ? "Please complete a Systems Check and repeat your vitals."
        : "Please repeat the affected measurement when the next sensor window is available.",
    );
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Stethoscope size={17} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.01em] text-ink">
              AstraHealth · Flight Surgeon
              <span className="rounded-full bg-watch-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-watch">
                Demo
              </span>
            </p>
            <p className="truncate text-[11px] text-muted">
              Earth · Mission Control
              {detail?.mission
                ? ` · ${detail.mission.name} · Day ${detail.mission.mission_day} · ${detail.mission.comms_delay_min} min delay`
                : ""}
            </p>
          </div>
          <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-2 sm:inline-flex">
            {user?.full_name ?? "Flight Surgeon"}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut size={13} aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 space-y-3 lg:w-72">
          <Panel title="Crew" subtitle={`${crew.length} crew members`}>
            <div className="space-y-1.5">
              {crew.map((memberSummary) => {
                const memberStatus = memberSummary.readiness_status
                  ? asStatus(memberSummary.readiness_status)
                  : null;
                const selected = memberSummary.id === activeId;
                return (
                  <button
                    key={memberSummary.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectCrew(memberSummary)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-accent/30 bg-accent-soft/50"
                        : "border-line bg-surface hover:bg-surface-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink-2">
                          {initials(memberSummary.full_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">
                            {memberSummary.full_name}
                          </p>
                          <p className="text-[10px] text-muted">{titleCase(memberSummary.role)}</p>
                        </div>
                      </div>
                      {memberStatus && <StatusPill status={memberStatus} />}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted">
                      <span>
                        {memberSummary.readiness_score !== null
                          ? `Readiness ${Math.round(memberSummary.readiness_score)}`
                          : "No score"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {memberSummary.active_alerts > 0 && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-medium",
                              memberSummary.critical_alerts > 0
                                ? "bg-critical-soft text-critical"
                                : "bg-watch-soft text-watch",
                            )}
                          >
                            {memberSummary.active_alerts} alert
                            {memberSummary.active_alerts === 1 ? "" : "s"}
                          </span>
                        )}
                        {memberSummary.open_instructions > 0 && (
                          <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-accent">
                            {memberSummary.open_instructions} open
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-[9px] text-muted">
                      Capture{" "}
                      {memberSummary.last_capture_at
                        ? formatRelativeTime(memberSummary.last_capture_at)
                        : "pending"}
                    </p>
                  </button>
                );
              })}
            </div>
          </Panel>
          <div className="rounded-xl border border-line bg-surface-muted/40 px-3 py-2.5 text-[10px] leading-relaxed text-muted">
            Medical console. Crew visibility preferences do not restrict flight-surgeon access.
            Guidance only; clinical judgment remains with the surgeon.
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          {!activeId && (
            <Panel title="No crew assigned">
              <p className="text-sm text-ink-2">Seed or assign a crew to use the console.</p>
            </Panel>
          )}

          {detailQuery.isLoading && <PageSkeleton />}

          {detailQuery.isError && (
            <QueryError
              title="Crew detail unavailable"
              message="The selected crew member could not be loaded."
              onRetry={() => void detailQuery.refetch()}
              retrying={detailQuery.isFetching}
            />
          )}

          {detail && member && (
            <>
              <Panel>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                      {initials(member.full_name)}
                    </span>
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
                        {member.full_name}
                      </h1>
                      <p className="text-xs text-muted">
                        {titleCase(member.role)} · {detail.mission.name} · Day{" "}
                        {detail.mission.mission_day} · {titleCase(detail.mission.profile)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Last check-in {formatDateTime(member.last_checkin_at)} · capture{" "}
                        {member.last_capture_at
                          ? formatRelativeTime(member.last_capture_at)
                          : "pending"}{" "}
                        · {activeAlerts.length} active alert
                        {activeAlerts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-5">
                    {readiness && status && (
                      <ReadinessRing
                        score={readiness.score}
                        status={status}
                        size={120}
                        factors={readiness.factors.length}
                        className="shrink-0"
                      />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => simulateCapture.mutate(undefined, {
                          onSuccess: () => toast.success("Capture received."),
                          onError: (error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Unable to simulate a capture.",
                            ),
                        })}
                        disabled={simulateCapture.isPending}
                      >
                        <RefreshCw
                          size={12}
                          className={simulateCapture.isPending ? "animate-spin" : undefined}
                          aria-hidden
                        />
                        Capture now
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => quickRequest("request_checkin")}>
                        Request check-in
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setTab("clinical");
                          window.setTimeout(() => {
                            document.getElementById("assessment-form")?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }, 50);
                        }}
                      >
                        New assessment
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>

              {criticalAlerts.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-critical/30 bg-critical-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-critical">
                    {criticalAlerts.length} critical alert
                    {criticalAlerts.length === 1 ? "" : "s"} active ·{" "}
                    {criticalAlerts[0].title}
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setTab("clinical");
                      document.getElementById("assessment-form")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                  >
                    Review and assess
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      tab === item.key
                        ? "bg-accent-soft text-accent"
                        : "text-muted hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel
                      title="Latest sensor capture"
                      subtitle={
                        detail.latest_capture.captured_at
                          ? `${detail.latest_capture.source_label} · ${formatRelativeTime(
                              detail.latest_capture.captured_at,
                            )}`
                          : "Waiting for the next capture."
                      }
                      actions={
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                          Simulated
                        </span>
                      }
                    >
                      {detail.latest_capture.metrics.length === 0 ? (
                        <p className="text-sm text-muted">No capture data yet.</p>
                      ) : (
                        <dl className="grid gap-2 sm:grid-cols-2">
                          {detail.latest_capture.metrics.map((metric) => (
                            <div
                              key={metric.metric_code}
                              className="flex items-baseline justify-between gap-2 rounded-lg bg-surface-muted/60 px-2.5 py-1.5"
                            >
                              <dt className="truncate text-[11px] text-muted">{metric.name}</dt>
                              <dd className="shrink-0 text-xs font-semibold tabular text-ink">
                                {displayMetricValue(metric.value)}{" "}
                                <span className="text-[10px] font-normal text-muted">
                                  {metric.unit}
                                </span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </Panel>

                    <Panel
                      title="Readiness"
                      subtitle={
                        readiness
                          ? `Computed ${formatPublished(readiness.computed_at)}`
                          : "No composite score yet."
                      }
                    >
                      {readiness ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-2xl font-semibold tabular text-ink">
                              {displayMetricValue(readiness.score)}
                              <span className="text-xs font-normal text-muted"> / 100</span>
                            </p>
                            {status && <StatusPill status={status} />}
                          </div>
                          <div className="space-y-1.5">
                            {Object.entries(readiness.domain_scores).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className="w-36 shrink-0 truncate text-[11px] text-ink-2">
                                  {DOMAIN_LABELS[key] ?? titleCase(key)}
                                </span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-[10px] tabular text-muted">
                                  {Math.round(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {readiness.fired_rules.length > 0 && (
                            <p className="text-[11px] text-critical">
                              Hard rules fired: {readiness.fired_rules.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-ink-2">
                          The astronaut needs a baseline before a composite score can be computed.
                        </p>
                      )}
                    </Panel>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel
                      title="Active alerts"
                      subtitle="Newest and most severe first."
                      actions={<span className="text-xs text-muted">{activeAlerts.length}</span>}
                    >
                      {activeAlerts.length === 0 ? (
                        <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-muted">
                          No active alerts.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {activeAlerts.map((alert) => (
                            <article
                              key={alert.id}
                              className="rounded-lg border border-line px-3 py-2.5"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={asStatus(alert.severity)} />
                                <span className="text-[10px] uppercase tracking-wide text-muted">
                                  {alert.rule_id}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-ink">{alert.title}</p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">
                                {alert.rationale}
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-ink">
                                {alert.recommended_action}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    acknowledgeAlert.mutate(alert.id, {
                                      onSuccess: () => toast.success("Alert acknowledged."),
                                      onError: (error) =>
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to acknowledge the alert.",
                                        ),
                                    })
                                  }
                                  disabled={acknowledgeAlert.isPending}
                                >
                                  Acknowledge
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="Recent check-ins"
                      subtitle="Subjective data and symptoms."
                      actions={
                        <span className="text-xs text-muted">{detail.checkins.length}</span>
                      }
                    >
                      {detail.checkins.length === 0 ? (
                        <p className="text-sm text-muted">No check-ins yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.checkins.slice(0, 4).map((checkin) => (
                            <div
                              key={checkin.id}
                              className="rounded-lg border border-line px-3 py-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-medium text-ink">
                                  {formatDateTime(checkin.completed_at)}
                                </p>
                                <span className="text-[10px] text-muted">
                                  {checkin.entries.length} readings ·{" "}
                                  {checkin.symptoms.length} symptoms
                                </span>
                              </div>
                              {checkin.symptoms.length > 0 && (
                                <p className="mt-1 text-[11px] text-critical">
                                  {checkin.symptoms
                                    .map((symptom) => `${symptom.symptom} (${symptom.severity}/10)`)
                                    .join(", ")}
                                </p>
                              )}
                              {checkin.notes && (
                                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                                  {checkin.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  {latestAssessment && (
                    <Panel
                      title="Latest clinical assessment"
                      subtitle="Shared with the crew when enabled."
                    >
                      <AssessmentCard assessment={latestAssessment} />
                    </Panel>
                  )}
                </div>
              )}

              {tab === "trends" && (
                <Panel
                  title="Metric trend"
                  subtitle="Captured and manual readings against the personal baseline."
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={metricCode}
                        onChange={(event) => setMetricCode(event.target.value)}
                        aria-label="Metric"
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                      >
                        {metrics.map((metric) => (
                          <option key={metric.code} value={metric.code}>
                            {metric.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
                        {([7, 30, 90] as Days[]).map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={days === value}
                            onClick={() => setDays(value)}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              days === value
                                ? "bg-accent-soft text-accent"
                                : "text-muted hover:text-ink",
                            )}
                          >
                            {value}d
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                >
                  {seriesQuery.isLoading && !seriesQuery.data ? (
                    <Skeleton className="h-[320px] w-full" />
                  ) : seriesQuery.isError || !seriesQuery.data ? (
                    <QueryError
                      title="Trend unavailable"
                      message="The metric series could not be loaded."
                      onRetry={() => void seriesQuery.refetch()}
                      retrying={seriesQuery.isFetching}
                    />
                  ) : (
                    <>
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                        <span>
                          Latest:{" "}
                          <span className="font-semibold text-ink">
                            {seriesQuery.data.latest
                              ? `${displayMetricValue(seriesQuery.data.latest.value)} ${seriesQuery.data.metric.unit}`
                              : "no reading"}
                          </span>
                        </span>
                        {seriesQuery.data.status && (
                          <StatusPill status={asStatus(seriesQuery.data.status)} />
                        )}
                        {seriesQuery.data.baseline && (
                          <span>
                            Baseline {displayMetricValue(seriesQuery.data.baseline.center)}{" "}
                            {seriesQuery.data.metric.unit} (median)
                          </span>
                        )}
                      </div>
                      <MetricChart
                        series={seriesQuery.data}
                        band="baseline"
                        events={NO_EVENTS}
                      />
                    </>
                  )}
                </Panel>
              )}

              {tab === "captures" && (
                <Panel
                  title="Recent measurements"
                  subtitle="Capture batches and manual entries, newest first."
                  actions={
                    <div className="flex flex-wrap items-center gap-1">
                      {(["all", "capture", "manual"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={captureFilter === value}
                          onClick={() => setCaptureFilter(value)}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            captureFilter === value
                              ? "bg-accent-soft text-accent"
                              : "text-muted hover:text-ink",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  }
                >
                  {filteredMeasurements.length === 0 ? (
                    <p className="text-sm text-muted">No measurements in this view.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                            <th className="py-2 pr-2 font-medium">Time</th>
                            <th className="py-2 pr-2 font-medium">Metric</th>
                            <th className="py-2 pr-2 font-medium">Value</th>
                            <th className="py-2 pr-2 font-medium">Source</th>
                            <th className="py-2 font-medium">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMeasurements.slice(0, 50).map((measurement) => {
                            const metric = metricMap.get(measurement.metric_code);
                            return (
                              <tr key={measurement.id} className="border-b border-line/60">
                                <td className="py-1.5 pr-2 text-muted">
                                  {formatDateTime(measurement.measured_at)}
                                </td>
                                <td className="py-1.5 pr-2 text-ink">
                                  {metric?.name ?? measurement.metric_code}
                                </td>
                                <td className="py-1.5 pr-2 font-medium tabular text-ink">
                                  {displayMetricValue(measurement.value)} {measurement.unit}
                                </td>
                                <td className="py-1.5 pr-2 text-ink-2">
                                  {sourceLabel(measurement.source)}
                                </td>
                                <td className="py-1.5 text-muted">
                                  {measurement.confidence !== null
                                    ? measurement.confidence.toFixed(2)
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}

              {tab === "clinical" && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-4">
                    <Panel
                      title="New clinical assessment"
                      subtitle="Diagnosis, findings, and plan. The crew sees this only when shared."
                    >
                      <div id="assessment-form" className="space-y-3">
                        <label className="block text-[11px] font-medium text-muted">
                          Working diagnosis
                          <input
                            value={diagnosis}
                            onChange={(event) => setDiagnosis(event.target.value)}
                            placeholder="e.g. Sleep debt with autonomic strain"
                            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-muted">
                          Findings
                          <textarea
                            value={findings}
                            onChange={(event) => setFindings(event.target.value)}
                            rows={3}
                            placeholder="What the captures, check-ins, and alerts show."
                            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-muted">
                          Plan
                          <textarea
                            value={plan}
                            onChange={(event) => setPlan(event.target.value)}
                            rows={3}
                            placeholder="Monitoring, countermeasures, escalation criteria."
                            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-muted">
                          Follow-up
                          <input
                            value={followUp}
                            onChange={(event) => setFollowUp(event.target.value)}
                            placeholder="e.g. Review in 12 hours"
                            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-ink-2">
                          <input
                            type="checkbox"
                            checked={shareWithCrew}
                            onChange={(event) => setShareWithCrew(event.target.checked)}
                            className="h-4 w-4 rounded border-line text-accent"
                          />
                          Share the assessment with the astronaut
                        </label>
                        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                          <p className="text-[10px] leading-relaxed text-muted">
                            Clinical judgment by the flight surgeon. Not AI-generated.
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={submitAssessment}
                            disabled={createAssessment.isPending}
                          >
                            <ClipboardList size={12} aria-hidden />
                            {createAssessment.isPending ? "Saving…" : "Save assessment"}
                          </Button>
                        </div>
                      </div>
                    </Panel>

                    <Panel title="Assessment history" subtitle="Newest first.">
                      {detail.assessments.length === 0 ? (
                        <p className="text-sm text-muted">No assessments yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.assessments.map((assessment) => (
                            <AssessmentCard key={assessment.id} assessment={assessment} />
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  <div className="space-y-4">
                    <Panel title="Send to the crew" subtitle="A request or a short note.">
                      <div className="space-y-2.5">
                        <select
                          value={instructionKind}
                          onChange={(event) =>
                            setInstructionKind(
                              event.target.value as
                                | "note"
                                | "request_checkin"
                                | "request_measurement",
                            )
                          }
                          aria-label="Instruction kind"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
                        >
                          <option value="note">Note</option>
                          <option value="request_checkin">Request a check-in</option>
                          <option value="request_measurement">Request a measurement</option>
                        </select>
                        <textarea
                          value={instructionMessage}
                          onChange={(event) => setInstructionMessage(event.target.value)}
                          rows={3}
                          placeholder="What should the astronaut do next?"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => quickRequest("request_measurement")}
                            disabled={createInstruction.isPending}
                          >
                            Request measurement
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => sendInstruction()}
                            disabled={createInstruction.isPending}
                          >
                            <Send size={12} aria-hidden />
                            Send
                          </Button>
                        </div>
                      </div>
                    </Panel>

                    <Panel title="Crew instructions" subtitle="Open items need attention.">
                      {detail.instructions.length === 0 ? (
                        <p className="text-sm text-muted">No instructions sent yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.instructions.map((instruction) => (
                            <InstructionCard key={instruction.id} instruction={instruction} />
                          ))}
                        </div>
                      )}
                    </Panel>

                    <Panel title="Alert history" subtitle="Active, acknowledged, and resolved.">
                      {detail.alerts.length === 0 ? (
                        <p className="text-sm text-muted">No alerts recorded.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.alerts.slice(0, 10).map((alert) => (
                            <div key={alert.id} className="rounded-lg border border-line px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={asStatus(alert.severity)} />
                                <span className="text-[10px] uppercase tracking-wide text-muted">
                                  {alert.status} · {alert.rule_id} ·{" "}
                                  {formatDateTime(alert.created_at)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-medium text-ink">{alert.title}</p>
                              {alert.status === "active" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="mt-1.5"
                                  onClick={() =>
                                    acknowledgeAlert.mutate(alert.id, {
                                      onSuccess: () => toast.success("Alert acknowledged."),
                                      onError: (error) =>
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to acknowledge the alert.",
                                        ),
                                    })
                                  }
                                  disabled={acknowledgeAlert.isPending}
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>

                    <Panel title="Check-in record" subtitle="Latest subjective entries.">
                      {detail.checkins.length === 0 ? (
                        <p className="text-sm text-muted">No check-ins yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {detail.checkins.map((checkin) => (
                            <div key={checkin.id} className="rounded-lg border border-line px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-medium text-ink">
                                  {formatDateTime(checkin.completed_at)}
                                </p>
                                <span className="text-[10px] text-muted">
                                  {checkin.entries.length} readings · {checkin.symptoms.length}{" "}
                                  symptoms
                                </span>
                              </div>
                              {checkin.symptoms.length > 0 && (
                                <p className="mt-1 text-[11px] text-critical">
                                  {checkin.symptoms
                                    .map(
                                      (symptom) =>
                                        `${symptom.symptom} (${symptom.severity}/10, ${
                                          symptom.duration ?? "duration unknown"
                                        })`,
                                    )
                                    .join(", ")}
                                </p>
                              )}
                              {checkin.notes && (
                                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                                  {checkin.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
