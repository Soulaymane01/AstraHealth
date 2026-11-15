import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  LogOut,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PersonStanding,
  RefreshCw,
  ScanLine,
  Send,
  Sparkles,
  Stethoscope,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AnatomyMap } from "@/components/ui/AnatomyMap";
import { Button } from "@/components/ui/Button";
import { DomainRail } from "@/components/ui/DomainRail";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusPill } from "@/components/ui/Status";
import { useAuthStore } from "@/features/auth/auth-store";
import { useShellStore } from "@/features/shell/shell-store";
import { MetricChart } from "@/features/telemetry/components/MetricChart";
import { sourceLabel } from "@/features/telemetry/telemetry-config";
import { useMetricDefinitions } from "@/features/telemetry/queries";
import {
  useAcknowledgeCrewAlert,
  useAskSurgeonAssistant,
  useCreateAssessment,
  useCreateInstruction,
  useSimulateCrewCapture,
  useSurgeonCrew,
  useSurgeonDetail,
  useSurgeonPrediction,
  useSurgeonQuizDetail,
  useSurgeonQuizzes,
  useSurgeonSeries,
} from "@/features/surgeon/queries";
import type {
  AssistantCitation,
  Prediction,
  MetricDefinition,
  SurgeonAssessment,
  SurgeonCrewDetail,
  SurgeonCrewSummary,
  SurgeonInstruction,
  SurgeonQuizDetail,
  TapeEvent,
} from "@/lib/api/types";
import { asStatus, STATUS_META, statusFromScore } from "@/lib/status";
import { cn, displayMetricValue, formatRelativeTime, initials, titleCase } from "@/lib/utils";

type TabKey = "overview" | "body" | "trends" | "captures" | "quizzes" | "clinical" | "copilot";
type Measurement = SurgeonCrewDetail["measurements"][number];
type Days = 7 | 30 | 90;

const SECTIONS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "body", label: "Body", icon: PersonStanding },
  { key: "trends", label: "Trends", icon: LineChart },
  { key: "captures", label: "Captures", icon: ScanLine },
  { key: "quizzes", label: "Quizzes & screens", icon: ClipboardCheck },
  { key: "clinical", label: "Clinical record", icon: NotebookPen },
  { key: "copilot", label: "Copilot", icon: Sparkles },
];

const NO_EVENTS: TapeEvent[] = [];

const KEY_VITALS = [
  { code: "heart_rate", label: "Heart rate", icon: HeartPulse },
  { code: "hrv_rmssd", label: "HRV", icon: Activity },
  { code: "spo2", label: "Oxygen", icon: Wind },
  { code: "body_temp_c", label: "Temperature", icon: Thermometer },
];

const DOMAIN_LABELS: Record<string, string> = {
  cardiovascular: "Cardiovascular",
  musculoskeletal: "Musculoskeletal",
  sleep: "Sleep & circadian",
  neurobehavioral: "Neurobehavioral",
  metabolic: "Metabolic & nutrition",
  immune: "Immune & sensory",
};

const RISK_BADGE: Record<Prediction["risk_level"], string> = {
  high: "border-critical/30 bg-critical-soft text-critical",
  moderate: "border-watch/30 bg-watch-soft text-watch",
  low: "border-nominal/25 bg-nominal-soft text-nominal",
};

const RISK_RING: Record<Prediction["risk_level"], string> = {
  high: "border-critical/30 bg-critical-soft/40",
  moderate: "border-watch/30 bg-watch-soft/40",
  low: "border-nominal/25 bg-nominal-soft/40",
};

const SIGNAL_BADGE: Record<"watch" | "moderate" | "high", string> = {
  high: RISK_BADGE.high,
  moderate: RISK_BADGE.moderate,
  watch: "border-line bg-surface-muted text-muted",
};

const DEFAULT_COPILOT_QUESTIONS = [
  "What is the early-warning risk?",
  "What is driving the readiness score?",
  "Which signals are worsening?",
  "What should I monitor next?",
  "What questions should I ask the crew?",
  "Summarize the last 72 hours.",
];

const COPILOT_WELCOME =
  "I can summarize the captures, explain the early-warning risk, and suggest questions or monitoring. I do not diagnose or prescribe; the flight surgeon decides.";

interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AssistantCitation[];
  refused?: boolean;
  mode?: string;
}

function PredictionCard({
  prediction,
  onAsk,
}: {
  prediction: Prediction;
  onAsk?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            RISK_BADGE[prediction.risk_level],
          )}
        >
          {prediction.risk_level} risk
        </span>
        <span className="text-[11px] text-muted">
          {prediction.risk_score}/100 · next {prediction.horizon_hours}h · confidence{" "}
          {prediction.confidence} · coverage{" "}
          {Math.round(prediction.data_coverage * 100)}%
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-2">{prediction.summary}</p>

      {prediction.red_flags.length > 0 && (
        <div className="rounded-lg border border-critical/25 bg-critical-soft px-3 py-2 text-[11px] leading-relaxed text-critical">
          Red flags: {prediction.red_flags.join("; ")}.
        </div>
      )}

      {prediction.drivers.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Signals</p>
          <div className="mt-1.5 space-y-1.5">
            {prediction.drivers.map((driver) => (
              <div
                key={driver.metric}
                className="rounded-lg border border-line bg-surface px-2.5 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-ink">{driver.label}</p>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                      SIGNAL_BADGE[driver.severity],
                    )}
                  >
                    {driver.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {driver.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted">Suggested monitoring</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-ink-2">
          {prediction.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <p className="max-w-[70%] text-[10px] leading-relaxed text-muted">
          {prediction.disclaimer}
        </p>
        {onAsk && (
          <Button variant="secondary" size="sm" onClick={onAsk}>
            <Sparkles size={11} aria-hidden />
            Ask Copilot
          </Button>
        )}
      </div>
    </div>
  );
}

function EarlyWarningBanner({
  prediction,
  onOpen,
}: {
  prediction: Prediction;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        RISK_RING[prediction.risk_level],
      )}
    >
      <div className="flex items-start gap-3">
        <CalendarClock size={17} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-ink">
            Early warning · {prediction.risk_level} risk · next{" "}
            {prediction.horizon_hours} hours
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-2">
            {prediction.summary}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" className="shrink-0" onClick={onOpen}>
        <Sparkles size={12} aria-hidden />
        Open Copilot
      </Button>
    </div>
  );
}

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

function BodySystemsTab({
  detail,
  metrics,
  selectedDomain,
  onSelectDomain,
  onOpenTrend,
}: {
  detail: SurgeonCrewDetail;
  metrics: MetricDefinition[];
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  onOpenTrend: (code: string) => void;
}) {
  const scores = detail.readiness?.domain_scores ?? {};
  const previous = detail.readiness_history[1]?.domain_scores;
  const domainStatus = (key: string) =>
    scores[key] === undefined ? "unknown" : statusFromScore(scores[key]);
  const regions = {
    cardiovascular: { label: "Chest & heart", status: domainStatus("cardiovascular") },
    musculoskeletal: { label: "Muscles & bone", status: domainStatus("musculoskeletal") },
    metabolic: { label: "Core & metabolism", status: domainStatus("metabolic") },
    neurobehavioral: { label: "Head & cognition", status: domainStatus("neurobehavioral") },
    immune: { label: "Whole body", status: domainStatus("immune") },
    sleep: { label: "Sleep & circadian", status: domainStatus("sleep") },
  } as const;
  const domainKeys = Object.keys(DOMAIN_LABELS);
  const latest = new Map<string, Measurement>();
  for (const measurement of detail.measurements) {
    const current = latest.get(measurement.metric_code);
    if (
      !current ||
      new Date(measurement.measured_at).getTime() > new Date(current.measured_at).getTime()
    ) {
      latest.set(measurement.metric_code, measurement);
    }
  }
  const domainMetrics = metrics.filter(
    (metric) => metric.domain === DOMAIN_LABELS[selectedDomain],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel
        className="xl:col-span-7"
        title="Body systems"
        subtitle="3D anatomy · click a region"
      >
        <AnatomyMap
          regions={regions}
          selectedDomain={selectedDomain}
          onSelectDomain={onSelectDomain}
        />
      </Panel>

      <div className="space-y-3 xl:col-span-5">
        <Panel title="Domains" subtitle="Readiness by system">
          <div className="space-y-0.5">
            {domainKeys.map((key) => (
              <DomainRail
                key={key}
                name={DOMAIN_LABELS[key]}
                score={scores[key] ?? 0}
                status={domainStatus(key)}
                delta={
                  scores[key] !== undefined && previous?.[key] !== undefined
                    ? Math.round((scores[key] - previous[key]) * 10) / 10
                    : undefined
                }
                active={selectedDomain === key}
                onClick={() => onSelectDomain(key)}
              />
            ))}
          </div>
        </Panel>

        <Panel
          title={DOMAIN_LABELS[selectedDomain] ?? titleCase(selectedDomain)}
          actions={<StatusPill status={domainStatus(selectedDomain)} />}
        >
          <p className="text-[11px] text-muted">
            Latest readings · tap a metric for its trend
          </p>
          <div className="mt-2 divide-y divide-line">
            {domainMetrics.length === 0 ? (
              <p className="py-3 text-[11px] text-muted">No metrics mapped to this domain.</p>
            ) : (
              domainMetrics.map((metric) => {
                const reading = latest.get(metric.code);
                return (
                  <button
                    key={metric.code}
                    type="button"
                    onClick={() => onOpenTrend(metric.code)}
                    className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:bg-surface-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-ink">{metric.name}</p>
                      <p className="text-[9px] text-muted">
                        {reading ? formatRelativeTime(reading.measured_at) : "No reading"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular text-ink">
                      {reading ? displayMetricValue(reading.value) : "—"}
                      <span className="ml-1 text-[9px] font-normal text-muted">
                        {reading?.unit ?? metric.unit}
                      </span>
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SurgeonQuizDetailSheet({
  open,
  onClose,
  detail,
  loading,
  error,
  onRetry,
  retrying,
  fallbackTitle,
}: {
  open: boolean;
  onClose: () => void;
  detail?: SurgeonQuizDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  retrying: boolean;
  fallbackTitle?: string;
}) {
  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title={detail?.title ?? fallbackTitle ?? "Quiz results"}
      subtitle="Read-only results"
      icon={ClipboardCheck}
      size="lg"
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error || !detail ? (
        <QueryError
          title="Quiz results unavailable"
          message="The detailed quiz results could not be loaded."
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold uppercase tracking-wide text-accent">
              {detail.kind === "screening" ? "Screening" : "Knowledge check"}
            </span>
            <span>{detail.question_count} questions</span>
            <span>·</span>
            <span>
              {detail.attempts.length} attempt
              {detail.attempts.length === 1 ? "" : "s"}
            </span>
          </div>

          {detail.attempts.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-3 py-3 text-[12px] text-muted">
              This astronaut has not taken this check yet.
            </p>
          ) : (
            detail.attempts.map((attempt, index) => {
              const screening = detail.kind === "screening";
              const correct = attempt.questions.filter((question) => question.correct).length;
              return (
                <Disclosure
                  key={attempt.id}
                  defaultOpen={index === 0}
                  className="rounded-2xl border border-line bg-surface px-3 py-2.5"
                  summary={
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-ink">
                        {formatDateTime(attempt.completed_at)}
                      </span>
                      {attempt.subject_name && (
                        <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] text-ink-2">
                          About {attempt.subject_name}
                        </span>
                      )}
                      {attempt.self_harm_flag && (
                        <span className="rounded-full bg-critical px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          Self-harm
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] font-semibold tabular text-ink">
                        {screening
                          ? `${attempt.total_score}/${detail.max_score} · ${attempt.severity_label}`
                          : `${Math.round(attempt.score)}% · ${correct}/${detail.question_count}`}
                      </span>
                    </span>
                  }
                  summaryClassName="items-start"
                  bodyClassName="space-y-2"
                >
                  {screening && attempt.severity_advice && (
                    <p className="rounded-lg bg-surface-muted px-2.5 py-2 text-[10px] leading-relaxed text-ink-2">
                      {attempt.severity_advice}
                    </p>
                  )}
                  <ol className="space-y-2">
                    {attempt.questions.map((question, questionIndex) => (
                      <li
                        key={question.id}
                        className="rounded-lg border border-line/70 bg-surface px-2.5 py-2"
                      >
                        <p className="text-[10px] font-medium leading-relaxed text-ink">
                          {questionIndex + 1}. {question.prompt}
                        </p>
                        <p className="mt-1 text-[10px] text-ink-2">
                          Selected:{" "}
                          <span className="font-medium text-ink">
                            {question.options[question.selected_index ?? 0] ?? "No answer"}
                          </span>
                        </p>
                        {!screening && !question.correct && (
                          <p className="text-[10px] text-nominal">
                            Correct: {question.options[question.answer_index]}
                          </p>
                        )}
                        {!screening && question.explanation && (
                          <p className="mt-1 text-[9px] leading-relaxed text-muted">
                            {question.explanation}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </Disclosure>
              );
            })
          )}
        </div>
      )}
    </DetailSheet>
  );
}

function CrewPicker({
  crew,
  onSelect,
}: {
  crew: SurgeonCrewSummary[];
  onSelect: (member: SurgeonCrewSummary) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        Flight Surgeon
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
        Choose an astronaut.
      </h1>
      <p className="mt-1 text-sm text-muted">Open a profile to review the full record.</p>

      {crew.length === 0 ? (
        <Panel className="mt-6" title="No crew assigned">
          <p className="text-sm text-ink-2">Seed or assign a crew to use the console.</p>
        </Panel>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {crew.map((memberSummary) => {
            const memberStatus = memberSummary.readiness_status
              ? asStatus(memberSummary.readiness_status)
              : null;
            return (
              <button
                key={memberSummary.id}
                type="button"
                onClick={() => onSelect(memberSummary)}
                className={cn(
                  "group rounded-3xl border p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(10,42,92,0.12)]",
                  memberStatus ? STATUS_META[memberStatus].surface : "border-line bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface/75 text-xs font-semibold text-ink-2">
                      {initials(memberSummary.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink">
                        {memberSummary.full_name}
                      </p>
                      <p className="text-[11px] text-ink-2">{titleCase(memberSummary.role)}</p>
                    </div>
                  </div>
                  {memberStatus && <StatusPill status={memberStatus} />}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-5xl font-semibold leading-none tabular tracking-tight text-ink">
                      {memberSummary.readiness_score !== null
                        ? Math.round(memberSummary.readiness_score)
                        : "—"}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-2">readiness</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {memberSummary.active_alerts > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          memberSummary.critical_alerts > 0
                            ? "bg-critical text-white"
                            : "bg-surface/80 text-watch",
                        )}
                      >
                        {memberSummary.active_alerts} alert
                        {memberSummary.active_alerts === 1 ? "" : "s"}
                      </span>
                    )}
                    {memberSummary.open_instructions > 0 && (
                      <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-medium text-accent">
                        {memberSummary.open_instructions} open request
                        {memberSummary.open_instructions === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-2.5 text-[10px] text-ink/70">
                  <span>
                    Capture{" "}
                    {memberSummary.last_capture_at
                      ? formatRelativeTime(memberSummary.last_capture_at)
                      : "pending"}
                  </span>
                  <span className="font-semibold text-ink">Open profile →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SurgeonTopBar({
  member,
  missionLabel,
  collapsed,
  onToggle,
  showSidebarToggle,
  showUserActions,
  userName,
  onSignOut,
}: {
  member?: SurgeonCrewSummary;
  missionLabel?: string;
  collapsed: boolean;
  onToggle: () => void;
  showSidebarToggle: boolean;
  showUserActions: boolean;
  userName?: string;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur print:hidden lg:px-8">
      {showSidebarToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:bg-surface-muted hover:text-ink lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen size={15} aria-hidden /> : <PanelLeftClose size={15} aria-hidden />}
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
          {member ? member.full_name : "AstraHealth · Flight Surgeon"}
        </p>
        <p className="truncate text-[11px] text-muted">
          {member
            ? `${titleCase(member.role)}${missionLabel ? ` · ${missionLabel}` : ""}`
            : "Earth · Mission Control"}
        </p>
      </div>

      {showUserActions && (
        <>
          <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-2 sm:inline-flex">
            {userName ?? "Flight Surgeon"}
          </span>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut size={13} aria-hidden />
            Sign out
          </Button>
        </>
      )}
    </header>
  );
}

function SurgeonSidebar({
  member,
  activeSection,
  collapsed,
  onSection,
  onSwitch,
  userName,
  onSignOut,
}: {
  member?: SurgeonCrewSummary;
  activeSection: TabKey;
  collapsed: boolean;
  onSection: (section: TabKey) => void;
  onSwitch: () => void;
  userName?: string;
  onSignOut: () => void;
}) {
  const memberStatus = member?.readiness_status ? asStatus(member.readiness_status) : null;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-surface transition-[width] duration-300 lg:flex lg:flex-col",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center py-5",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Stethoscope size={17} aria-hidden />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold tracking-[-0.01em] text-ink">AstraHealth</p>
              <span className="rounded-full bg-watch-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-watch">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-muted">Flight Surgeon</p>
          </div>
        )}
      </div>

      {member && (
        <div className={cn("mb-2", collapsed ? "px-2" : "px-3")}>
          <div
            className={cn(
              "rounded-2xl border",
              memberStatus ? STATUS_META[memberStatus].surface : "border-line bg-surface",
              collapsed ? "p-1.5" : "p-2.5",
            )}
          >
            <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
              <button
                type="button"
                onClick={onSwitch}
                title="Switch astronaut"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface/75 text-[10px] font-semibold text-ink-2"
              >
                {initials(member.full_name)}
              </button>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{member.full_name}</p>
                  <p className="text-[10px] text-ink-2">{titleCase(member.role)}</p>
                </div>
              )}
              {!collapsed && memberStatus && (
                <>
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[memberStatus].dot)}
                    title={STATUS_META[memberStatus].label}
                    aria-hidden
                  />
                  <span className="sr-only">{STATUS_META[memberStatus].label}</span>
                </>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={onSwitch}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-surface/80 px-2 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-surface"
              >
                <ChevronLeft size={10} aria-hidden />
                Switch astronaut
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2" aria-label="Patient record sections">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSection(section.key)}
              aria-pressed={active}
              title={collapsed ? section.label : undefined}
              aria-label={collapsed ? section.label : undefined}
              className={cn(
                "relative flex w-full items-center rounded-lg text-sm transition-colors",
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-ink-2 hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon size={collapsed ? 18 : 16} aria-hidden />
              {!collapsed && section.label}
            </button>
          );
        })}
      </nav>

      <div className={cn("border-t border-line", collapsed ? "p-2" : "p-3")}>
        <div className={cn("flex items-center rounded-lg", collapsed ? "flex-col gap-1 py-1" : "gap-2.5 px-2 py-2")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {initials(userName ?? "Flight Surgeon")}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{userName ?? "Flight Surgeon"}</p>
              <p className="text-[11px] text-muted">Flight Surgeon</p>
            </div>
          )}
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <LogOut size={14} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SurgeonSectionNav({
  activeSection,
  onSection,
}: {
  activeSection: TabKey;
  onSection: (section: TabKey) => void;
}) {
  return (
    <nav className="mb-3 flex gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Patient record sections">
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const active = activeSection === section.key;
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onSection(section.key)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-colors",
              active
                ? "border-accent/30 bg-accent-soft font-medium text-accent"
                : "border-line bg-surface text-muted",
            )}
          >
            <Icon size={11} aria-hidden />
            {section.label}
          </button>
        );
      })}
    </nav>
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
    : undefined;
  const detailQuery = useSurgeonDetail(activeId);

  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedDomain, setSelectedDomain] = useState("cardiovascular");
  const [metricCode, setMetricCode] = useState("hrv_rmssd");
  const [days, setDays] = useState<Days>(30);
  const [captureFilter, setCaptureFilter] = useState<"all" | "capture" | "manual">("all");
  const [showAllCaptures, setShowAllCaptures] = useState(false);
  const [openQuizSlug, setOpenQuizSlug] = useState<string | null>(null);
  const sidebarCollapsed = useShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);
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
  const predictionQuery = useSurgeonPrediction(activeId);
  const quizzesQuery = useSurgeonQuizzes(activeId);
  const quizDetailQuery = useSurgeonQuizDetail(activeId, openQuizSlug ?? undefined);
  const askAssistant = useAskSurgeonAssistant(activeId ?? 0);
  const createAssessment = useCreateAssessment(activeId ?? 0);
  const createInstruction = useCreateInstruction(activeId ?? 0);
  const acknowledgeAlert = useAcknowledgeCrewAlert(activeId ?? 0);
  const simulateCapture = useSimulateCrewCapture(activeId ?? 0);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    { id: "welcome", role: "assistant", content: COPILOT_WELCOME },
  ]);
  const [copilotDraft, setCopilotDraft] = useState("");
  const [copilotSuggestions, setCopilotSuggestions] = useState(DEFAULT_COPILOT_QUESTIONS);

  useEffect(() => {
    setTab("overview");
    setCopilotMessages([{ id: "welcome", role: "assistant", content: COPILOT_WELCOME }]);
    setCopilotDraft("");
    setCopilotSuggestions(DEFAULT_COPILOT_QUESTIONS);
    setOpenQuizSlug(null);
  }, [activeId]);

  const metrics = metricsQuery.data ?? [];
  const metricMap = useMemo(
    () => new Map(metrics.map((metric) => [metric.code, metric])),
    [metrics],
  );

  const selectCrew = (member: SurgeonCrewSummary) => {
    setSearchParams({ crew: String(member.id) });
    setTab("overview");
  };

  const switchCrew = () => {
    setSearchParams({});
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
  const prediction = predictionQuery.data ?? detail?.prediction;
  const member = detail?.member;
  const readiness = detail?.readiness;
  const status = readiness ? asStatus(readiness.status) : null;
  const activeAlerts = (detail?.alerts ?? []).filter((alert) => alert.status === "active");
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === "critical");
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

  const sendCopilot = (question = copilotDraft) => {
    const trimmed = question.trim();
    if (!trimmed || askAssistant.isPending) return;
    setCopilotMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]);
    setCopilotDraft("");
    askAssistant.mutate(trimmed, {
      onSuccess: (answer) => {
        setCopilotMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: answer.answer,
            citations: answer.citations,
            refused: answer.refused,
            mode: answer.mode,
          },
        ]);
        setCopilotSuggestions(
          answer.suggestions.length > 0 ? answer.suggestions : DEFAULT_COPILOT_QUESTIONS,
        );
      },
      onError: (error) => {
        setCopilotMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              error instanceof Error
                ? error.message
                : "The clinical copilot could not answer right now.",
          },
        ]);
      },
    });
  };

  const openCopilot = (question?: string) => {
    setTab("copilot");
    if (question) {
      window.setTimeout(() => sendCopilot(question), 60);
    }
  };

  const selfHarmScreen = (quizzesQuery.data ?? []).find(
    (quiz) => quiz.latest_self_harm_flag,
  );
  const openQuiz = (quizzesQuery.data ?? []).find(
    (quiz) => quiz.slug === openQuizSlug,
  );
  const missionLabel = detail?.mission
    ? `${detail.mission.name} · Day ${detail.mission.mission_day}`
    : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      {activeId && (
        <SurgeonSidebar
          member={member}
          activeSection={tab}
          collapsed={sidebarCollapsed}
          onSection={setTab}
          onSwitch={switchCrew}
          userName={user?.full_name}
          onSignOut={signOut}
        />
      )}

      <div
        className={cn(
          "transition-[padding] duration-300",
          activeId && (sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-60"),
        )}
      >
        <SurgeonTopBar
          member={member}
          missionLabel={missionLabel}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          showSidebarToggle={Boolean(activeId)}
          showUserActions={!activeId}
          userName={user?.full_name}
          onSignOut={signOut}
        />

        {!activeId ? (
          <CrewPicker crew={crew} onSelect={selectCrew} />
        ) : (
          <main className="mx-auto w-full max-w-7xl px-4 py-5 lg:px-8">
            <SurgeonSectionNav activeSection={tab} onSection={setTab} />

            {detailQuery.isLoading && <PageSkeleton />}
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
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {initials(member.full_name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
                        {member.full_name}
                      </h1>
                      {status && <StatusPill status={status} />}
                    </div>
                    <p className="text-xs text-muted">
                      {titleCase(member.role)} · {detail.mission.name} · Day{" "}
                      {detail.mission.mission_day}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {activeAlerts.length} alerts · Capture{" "}
                      {member.last_capture_at
                        ? formatRelativeTime(member.last_capture_at)
                        : "pending"}
                    </p>
                  </div>
                </div>
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

              {prediction && (
                <EarlyWarningBanner prediction={prediction} onOpen={() => openCopilot()} />
              )}

              {selfHarmScreen && (
                <button
                  type="button"
                  onClick={() => setTab("quizzes")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-critical px-4 py-3 text-left text-white shadow-[0_10px_28px_rgba(153,27,27,0.22)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Sparkles size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                      Screening flag
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      Self-harm response reported · review now
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-white/80">Open</span>
                </button>
              )}



              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-12">
                    <Panel
                      className="lg:col-span-7"
                      title="Vitals"
                      subtitle={
                        detail.latest_capture.captured_at
                          ? `${detail.latest_capture.source_label} · ${formatRelativeTime(
                              detail.latest_capture.captured_at,
                            )}`
                          : "No capture yet"
                      }
                      actions={
                        <button
                          type="button"
                          onClick={() => setTab("captures")}
                          className="text-[10px] font-medium text-accent hover:text-accent-strong"
                        >
                          All captures →
                        </button>
                      }
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {KEY_VITALS.map(({ code, label, icon: Icon }) => {
                          const captured = detail.latest_capture.metrics.find(
                            (metric) => metric.metric_code === code,
                          );
                          const measured = detail.measurements.find(
                            (measurement) => measurement.metric_code === code,
                          );
                          const value = captured?.value ?? measured?.value;
                          const unit = captured?.unit ?? measured?.unit;
                          return (
                            <div key={code} className="rounded-2xl bg-surface-muted/70 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                                  {label}
                                </p>
                                <Icon size={14} className="text-accent/70" aria-hidden />
                              </div>
                              <p className="mt-1 text-3xl font-semibold leading-none tabular tracking-tight text-ink">
                                {value !== undefined ? displayMetricValue(value) : "—"}
                                {unit && (
                                  <span className="ml-1 text-[10px] font-normal text-muted">
                                    {unit}
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 truncate text-[9px] text-muted">
                                {captured
                                  ? "Current capture"
                                  : measured
                                    ? formatRelativeTime(measured.measured_at)
                                    : "No reading"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>

                    <Panel
                      className="lg:col-span-5"
                      title="Readiness"
                      subtitle="Six domains"
                      actions={status ? <StatusPill status={status} /> : undefined}
                    >
                      {readiness ? (
                        <div className="space-y-3">
                          <p className="text-4xl font-semibold tabular tracking-tight text-ink">
                            {displayMetricValue(readiness.score)}
                            <span className="text-xs font-normal text-muted"> / 100</span>
                          </p>
                          <div className="space-y-1.5">
                            {Object.entries(readiness.domain_scores).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className="w-28 shrink-0 truncate text-[10px] text-ink-2">
                                  {DOMAIN_LABELS[key] ?? titleCase(key)}
                                </span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      STATUS_META[statusFromScore(value)].dot,
                                    )}
                                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                                  />
                                </div>
                                <span className="w-7 text-right text-[10px] tabular text-ink-2">
                                  {Math.round(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {readiness.fired_rules.length > 0 && (
                            <p className="text-[10px] font-medium text-critical">
                              Rule override · {readiness.fired_rules.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No baseline yet.</p>
                      )}
                    </Panel>
                  </div>

                  <Panel
                    title="Alerts"
                    subtitle="Tap for detail"
                    actions={<span className="text-xs text-muted">{activeAlerts.length}</span>}
                  >
                    {activeAlerts.length === 0 ? (
                      <p className="rounded-xl bg-nominal-soft px-3 py-2.5 text-xs text-nominal">
                        No active alerts.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeAlerts.map((alert) => (
                          <article
                            key={alert.id}
                            className={cn(
                              "rounded-2xl border px-3 py-2",
                              STATUS_META[asStatus(alert.severity)].surface,
                            )}
                          >
                            <Disclosure
                              defaultOpen={alert.severity === "critical"}
                              summary={
                                <span className="flex min-w-0 flex-wrap items-center gap-2">
                                  <StatusBadge status={asStatus(alert.severity)} />
                                  <span className="truncate text-xs font-semibold text-ink">
                                    {alert.title}
                                  </span>
                                  <span className="ml-auto shrink-0 text-[9px] text-muted">
                                    {formatRelativeTime(alert.created_at)}
                                  </span>
                                </span>
                              }
                              summaryClassName="items-start"
                              bodyClassName="space-y-2"
                            >
                              <p className="text-[11px] leading-relaxed text-ink">
                                {alert.rationale}
                              </p>
                              {alert.recommended_action && (
                                <p className="rounded-lg bg-surface/75 px-2.5 py-2 text-[10px] leading-relaxed text-ink-2">
                                  {alert.recommended_action}
                                </p>
                              )}
                              <div className="flex justify-end">
                                <button
                                  type="button"
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
                                  className="rounded-full bg-surface/80 px-2 py-0.5 text-[9px] font-semibold text-ink-2"
                                >
                                  Acknowledge
                                </button>
                              </div>
                            </Disclosure>
                          </article>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>
              )}

              {tab === "body" && detail && (
                <BodySystemsTab
                  detail={detail}
                  metrics={metrics}
                  selectedDomain={selectedDomain}
                  onSelectDomain={setSelectedDomain}
                  onOpenTrend={(code) => {
                    setMetricCode(code);
                    setTab("trends");
                  }}
                />
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
                          {(showAllCaptures ? filteredMeasurements : filteredMeasurements.slice(0, 12)).map((measurement) => {
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
                      {filteredMeasurements.length > 12 && (
                        <button
                          type="button"
                          onClick={() => setShowAllCaptures((current) => !current)}
                          className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
                        >
                          {showAllCaptures
                            ? "Show fewer"
                            : `Show all ${filteredMeasurements.length} measurements`}
                        </button>
                      )}
                    </div>
                  )}
                </Panel>
              )}

              {tab === "quizzes" && (
                <Panel
                  title="Quizzes & screens"
                  subtitle={`Results for ${member.full_name}.`}
                >
                  {quizzesQuery.isLoading ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Skeleton className="h-44 w-full" />
                      <Skeleton className="h-44 w-full" />
                    </div>
                  ) : quizzesQuery.isError ? (
                    <QueryError
                      title="Quiz results unavailable"
                      message="The quiz results could not be loaded."
                      onRetry={() => void quizzesQuery.refetch()}
                      retrying={quizzesQuery.isFetching}
                    />
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {[...(quizzesQuery.data ?? [])]
                        .sort((a, b) => {
                          const order = [
                            "know-yourself",
                            "know-your-crew",
                            "phq9-depression",
                            "gad7-anxiety",
                          ];
                          return order.indexOf(a.slug) - order.indexOf(b.slug);
                        })
                        .map((quiz) => {
                        const screening = quiz.kind === "screening";
                        const best = quiz.best_score;
                        const latest = quiz.attempts[0];
                        const modeLabel = screening
                          ? "Screening"
                          : quiz.mode === "crew"
                            ? "Crew"
                            : "Self";
                        const displayValue = screening
                          ? latest?.total_score !== null && latest?.total_score !== undefined
                            ? `${latest.total_score}/${quiz.max_score}`
                            : "—"
                          : best === null
                            ? "—"
                            : Math.round(best).toString();
                        const progress = screening
                          ? ((latest?.total_score ?? 0) / (quiz.max_score ?? 1)) * 100
                          : (best ?? 0);
                        return (
                          <button
                            key={quiz.slug}
                            type="button"
                            onClick={() => setOpenQuizSlug(quiz.slug)}
                            className="rounded-2xl border border-line bg-surface p-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_14px_30px_rgba(10,42,92,0.10)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                                  {modeLabel}
                                </span>
                                <h3 className="mt-2 text-[13px] font-semibold leading-snug text-ink">
                                  {quiz.title}
                                </h3>
                                <p className="mt-0.5 text-[10px] text-muted">
                                  {quiz.question_count} questions
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-2xl font-semibold leading-none tabular text-ink">
                                  {displayValue}
                                </p>
                                <p className="mt-1 text-[9px] text-muted">
                                  {screening ? "latest" : "best %"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted">
                              <span>
                                {quiz.attempt_count} attempt
                                {quiz.attempt_count === 1 ? "" : "s"}
                              </span>
                              <span>
                                {latest ? formatRelativeTime(latest.completed_at) : "Not taken"}
                              </span>
                            </div>

                            {latest && (
                              <p className="mt-2 rounded-lg bg-surface-muted px-2.5 py-1.5 text-[10px] text-ink-2">
                                Latest:{" "}
                                <span className="font-semibold text-ink">
                                  {screening
                                    ? `${latest.total_score}/${quiz.max_score} · ${latest.severity_label}`
                                    : `${Math.round(latest.score)}%`}
                                </span>
                                {!screening && latest.subject_name
                                  ? ` · about ${latest.subject_name}`
                                  : ""}
                              </p>
                            )}

                            {latest?.self_harm_flag && (
                              <p className="mt-2 rounded-lg bg-critical px-2.5 py-1.5 text-[10px] font-semibold text-white">
                                Self-harm reported · review now
                              </p>
                            )}

                            <p className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[10px] font-medium text-accent">
                              Open results
                              <ArrowRight size={11} aria-hidden />
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-3 text-[10px] text-muted">
                    Health-literacy checks only · not a clinical finding.
                  </p>
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

                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>
                </div>
              )}

              {tab === "copilot" && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Panel
                    title="Early-warning analysis"
                    subtitle="Transparent signals from the recent record. Not a diagnosis."
                  >
                    {prediction ? (
                      <PredictionCard
                        prediction={prediction}
                        onAsk={() => sendCopilot("What is the early-warning risk?")}
                      />
                    ) : predictionQuery.isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <p className="text-sm text-muted">
                        Not enough recent data for an early-warning analysis.
                      </p>
                    )}
                  </Panel>

                  <Panel
                    title="Clinical Copilot"
                    subtitle="Decision support. It explains and suggests; it does not diagnose."
                    actions={
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
                        <Sparkles size={9} aria-hidden />
                        AI
                      </span>
                    }
                  >
                    <div
                      className="max-h-[360px] space-y-3 overflow-y-auto pr-1"
                      role="log"
                      aria-live="polite"
                    >
                      {copilotMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[94%] rounded-lg px-3 py-2.5",
                            message.role === "user"
                              ? "ml-auto bg-accent-soft"
                              : "bg-surface-muted",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {message.refused && (
                              <span className="rounded-full bg-critical-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-critical">
                                Refused
                              </span>
                            )}
                            {message.mode && (
                              <span className="text-[9px] uppercase tracking-wide text-muted">
                                {message.mode === "llm" ? "LLM" : "Rule-based"}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink">
                            {message.content}
                          </p>
                          {message.citations && message.citations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.citations.map((citation) => (
                                <a
                                  key={citation.slug}
                                  href={citation.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] text-ink-2 hover:border-accent/30 hover:text-accent"
                                >
                                  {citation.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {askAssistant.isPending && (
                        <p className="rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
                          Reading the record and early-warning signals…
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {copilotSuggestions.slice(0, 5).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => sendCopilot(suggestion)}
                          disabled={askAssistant.isPending}
                          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] text-ink-2 transition-colors hover:border-accent/30 hover:text-accent disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    <form
                      className="mt-2 flex items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        sendCopilot();
                      }}
                    >
                      <input
                        value={copilotDraft}
                        onChange={(event) => setCopilotDraft(event.target.value)}
                        placeholder="Ask about the record, risk, or next steps…"
                        aria-label="Ask the clinical copilot"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="icon"
                        aria-label="Send to copilot"
                        disabled={askAssistant.isPending}
                      >
                        <Send size={13} aria-hidden />
                      </Button>
                    </form>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted">
                      The copilot summarizes evidence and flags early-warning signals. It never
                      diagnoses or prescribes; clinical judgment remains with the flight surgeon.
                    </p>
                  </Panel>
                </div>
              )}

              <SurgeonQuizDetailSheet
                open={Boolean(openQuizSlug)}
                onClose={() => setOpenQuizSlug(null)}
                detail={quizDetailQuery.data}
                loading={quizDetailQuery.isLoading}
                error={quizDetailQuery.isError}
                onRetry={() => void quizDetailQuery.refetch()}
                retrying={quizDetailQuery.isFetching}
                fallbackTitle={openQuiz?.title}
              />
            </>
          )}
          </main>
        )}
      </div>
    </div>
  );
}
