import {
  AlertTriangle,
  ArrowRight,
  Check,
  CloudSun,
  Dumbbell,
  Flame,
  HeartPulse,
  Orbit,
  Radio,
  RefreshCw,
  ScrollText,
  Shield,
  Stethoscope,
  Sun,
  Trophy,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AnatomyMap } from "@/components/ui/AnatomyMap";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { DomainRail } from "@/components/ui/DomainRail";
import { MissionTape, type TapeEventType } from "@/components/ui/MissionTape";
import { Panel } from "@/components/ui/Panel";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusLegend, StatusPill } from "@/components/ui/Status";
import { useAcknowledgeAlert, useAlerts } from "@/features/alerts/queries";
import { useSessionStore } from "@/features/session/session-store";
import { CaptureStrip } from "@/features/captures/CaptureStrip";
import { useCaptureFeed } from "@/features/captures/queries";
import { useAchievements, useGamificationSummary } from "@/features/gamification/queries";
import { SurgeonUpdatesPanel } from "@/features/surgeon/SurgeonUpdatesPanel";
import { useSurgeonUpdates } from "@/features/surgeon/queries";
import { useOfflineStore } from "@/features/offline/store";
import {
  useMission,
  useMissionContext,
  useMissionTape,
  useUpdateMissionProfile,
  type MissionProfile,
} from "@/features/mission/queries";
import { useDomainDetail, useReadiness, useReadinessHistory } from "@/features/readiness/queries";
import { DutyRoster } from "@/features/training/components/DutyRoster";
import { useTrainingRoster } from "@/features/training/queries";
import { PagePlaceholder } from "@/features/shared/PagePlaceholder";
import type { Achievement, Alert, DomainDetail, GamificationSummary, Readiness } from "@/lib/api/types";
import { asStatus, statusFromScore, STATUS_META, type Status } from "@/lib/status";
import {
  cn,
  displayMetricValue,
  firstName,
  formatRelativeTime,
  greeting,
  titleCase,
} from "@/lib/utils";

const DOMAIN_ROWS = [
  { key: "cardiovascular", name: "Cardiovascular" },
  { key: "musculoskeletal", name: "Musculoskeletal" },
  { key: "sleep", name: "Sleep & circadian" },
  { key: "neurobehavioral", name: "Neurobehavioral" },
  { key: "metabolic", name: "Metabolic & nutrition" },
  { key: "immune", name: "Immune & sensory" },
];

const DOMAIN_SHORT: Record<string, string> = {
  cardiovascular: "Heart",
  musculoskeletal: "Muscles",
  sleep: "Sleep",
  neurobehavioral: "Mind",
  metabolic: "Metabolic",
  immune: "Immune",
};

function profileLabel(profile: string): string {
  if (profile === "mars_transit") return "Mars transit";
  if (profile === "lunar_surface") return "Lunar surface";
  if (profile === "station") return "Space station";
  return titleCase(profile);
}

function weatherStatus(severity: string): Status {
  if (severity === "severe") return "critical";
  if (severity === "moderate") return "caution";
  return "watch";
}

type ReadinessFactor = Readiness["factors"][number];

function factorDirection(factor: ReadinessFactor): string {
  if (factor.metric === "sleep_duration_h") return "Short";
  if (factor.metric === "hydration_l") return "Low";
  if (factor.metric === "sleep_efficiency_pct") return "Below";
  return factor.z < 0 ? "Below" : "Above";
}

function FactorStat({ factor }: { factor: ReadinessFactor }) {
  const negative = factor.contribution < 0;
  const meta = STATUS_META[negative ? "caution" : "nominal"];
  return (
    <div className="min-w-0 rounded-xl border border-line/70 bg-surface px-3 py-2.5">
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
        {factor.label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular tracking-tight text-ink">
        {displayMetricValue(factor.value)}
        {factor.unit && <span className="ml-1 text-[10px] font-normal text-muted">{factor.unit}</span>}
      </p>
      <p className={cn("mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium", meta.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        {factorDirection(factor)}
      </p>
    </div>
  );
}

function QuickTile({
  icon: Icon,
  label,
  meta,
  status = "unknown",
  accent = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  status?: Status;
  accent?: boolean;
  onClick: () => void;
}) {
  const metaInfo = STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        accent ? "border-accent/20 bg-accent-soft" : metaInfo.surface,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          accent ? "bg-surface/80 text-accent" : "bg-surface/70 " + metaInfo.text,
        )}
      >
        <Icon size={16} aria-hidden />
      </span>
      <span className="mt-2 block text-[11px] font-semibold leading-tight text-ink">{label}</span>
      <span className={cn("mt-0.5 block truncate text-[9px] font-medium", accent ? "text-accent" : metaInfo.text)}>
        {meta}
      </span>
    </button>
  );
}

function CompactAlert({
  alert,
  onAcknowledge,
  onViewGuidance,
  onOpenCountermeasure,
  defaultOpen = false,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onViewGuidance?: () => void;
  onOpenCountermeasure?: () => void;
  defaultOpen?: boolean;
}) {
  const status = asStatus(alert.severity);
  return (
    <div data-testid="alert-row" className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <Disclosure
        defaultOpen={defaultOpen || alert.severity === "critical"}
        summary={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_META[status].dot)} />
            <span className="truncate text-[12px] font-medium text-ink">{alert.title}</span>
            <span className="ml-auto shrink-0 text-[10px] text-muted">
              {formatRelativeTime(alert.created_at)}
            </span>
          </span>
        }
        summaryClassName="items-start"
        bodyClassName="space-y-2"
      >
        <p className="text-[11px] leading-relaxed text-ink-2">{alert.rationale}</p>
        {alert.recommended_action && (
          <div className="rounded-lg bg-surface-muted px-2.5 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted">Recommended</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
              {alert.recommended_action}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {alert.countermeasure && (
            <button
              type="button"
              onClick={onOpenCountermeasure}
              className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent-soft/60 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent-soft"
            >
              <Dumbbell size={11} aria-hidden />
              <span className="text-[9px] uppercase tracking-wide text-muted">Countermeasure</span>
              {alert.countermeasure.name}
            </button>
          )}
          {onViewGuidance && (
            <button
              type="button"
              onClick={onViewGuidance}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
            >
              Guidance
              <ArrowRight size={11} aria-hidden />
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onAcknowledge}
            disabled={alert.status !== "active"}
          >
            <Check size={11} aria-hidden />
            {alert.status === "active" ? "Acknowledge" : "Acknowledged"}
          </Button>
        </div>
      </Disclosure>
    </div>
  );
}

function DomainDetailPanel({
  detail,
  loading,
  error,
  onRetry,
  onViewTrend,
}: {
  detail?: DomainDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onViewTrend: () => void;
}) {
  if (loading) return <Skeleton className="mt-4 h-48 w-full" />;
  if (error) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-3">
        <p className="text-xs text-ink-2">Unable to load this domain.</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium text-accent hover:text-accent-strong"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div className="mt-4 rounded-lg bg-surface-muted px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink">{detail.label}</p>
          <p className="text-[11px] text-muted">Domain score {displayMetricValue(detail.score)}</p>
        </div>
        <StatusPill status={asStatus(detail.status)} />
      </div>

      <div className="mt-2 divide-y divide-line">
        {detail.metrics.map((metric) => (
          <div key={metric.metric} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-ink">{metric.label}</p>
              <p className="text-[10px] text-muted">z {metric.z}</p>
            </div>
            <p className="text-[11px] tabular text-ink">
              {displayMetricValue(metric.value)}
              {metric.unit && <span className="ml-1 text-[10px] text-muted">{metric.unit}</span>}
            </p>
            <StatusBadge status={asStatus(metric.status)} />
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" className="mt-3" onClick={onViewTrend}>
        View trend
      </Button>
    </div>
  );
}

function FlightDeckLoading({
  name,
  mission,
}: {
  name: string;
  mission?: { crew_name: string; met_seconds: number; profile: string } | null;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {greeting()}, {name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Mission health overview
          </h1>
          <p className="mt-1.5 truncate text-sm text-ink-2">Reading your readiness…</p>
          <p
            className="truncate text-sm text-ink-2"
            title={mission ? "Mission context" : undefined}
          >
            {mission
              ? `${mission.crew_name} · Day ${Math.max(1, Math.floor(mission.met_seconds / 86400))} · ${profileLabel(mission.profile)}`
              : "Loading mission context…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Skeleton className="mt-4 h-[86px]" />

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-[560px] lg:col-span-8" />
        <Skeleton className="h-[560px] lg:col-span-4" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-[420px] lg:col-span-7" />
        <Skeleton className="h-[420px] lg:col-span-5" />
      </div>
    </div>
  );
}

function MomentumCard({
  summary,
  achievements,
  onOpen,
}: {
  summary?: GamificationSummary;
  achievements: Achievement[];
  onOpen: () => void;
}) {
  if (!summary) return null;
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const next = achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress - a.progress)[0];
  const streak = summary.checkin_streak;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group mt-4 w-full rounded-3xl border border-line bg-surface p-4 text-left transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
            Momentum
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            Consistency, not health readings.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-accent">
          Mission Log →
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-accent-soft px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-2">Rank</p>
            <Shield size={13} className="text-ink-2/70" aria-hidden />
          </div>
          <p className="mt-1 truncate text-lg font-semibold text-ink">{summary.rank.rank}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface/70">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(summary.rank.progress * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-surface-muted/70 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-2">
              Points
            </p>
            <Orbit size={13} className="text-ink-2/70" aria-hidden />
          </div>
          <p className="mt-1 text-lg font-semibold tabular text-ink">
            {summary.balance.toLocaleString()} <span className="text-[10px] font-normal text-muted">MP</span>
          </p>
          <p className="mt-1 truncate text-[9px] text-muted">
            {summary.rank.next_rank
              ? `${summary.rank.credits_to_next ?? 0} to ${summary.rank.next_rank}`
              : "Maximum rank"}
          </p>
        </div>

        <div className="rounded-2xl bg-watch-soft px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-2">
              Streak
            </p>
            <Flame size={13} className="text-watch" aria-hidden />
          </div>
          <p className="mt-1 text-lg font-semibold tabular text-ink">
            {streak?.current ?? 0} <span className="text-[10px] font-normal text-muted">days</span>
          </p>
          <p className="mt-1 text-[9px] text-muted">Longest {streak?.longest ?? 0}</p>
        </div>

        <div className="rounded-2xl bg-nominal-soft px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-2">
              Achievements
            </p>
            <Trophy size={13} className="text-nominal" aria-hidden />
          </div>
          <p className="mt-1 text-lg font-semibold tabular text-ink">
            {unlocked.length}/{achievements.length}
          </p>
          <p className="mt-1 truncate text-[9px] text-muted">
            {next ? `Next: ${next.name}` : "All unlocked"}
          </p>
        </div>
      </div>
    </button>
  );
}

export function FlightDeckPage() {
  const user = useSessionStore((state) => state.user);
  const online = useOfflineStore((state) => state.online);
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState("cardiovascular");
  const [tapeDays, setTapeDays] = useState<7 | 30>(30);
  const [detail, setDetail] = useState<
    "readiness" | "body" | "alerts" | "vitals" | "surgeon" | "tape" | "weather" | null
  >(null);

  const missionQuery = useMission();
  const readinessQuery = useReadiness();
  const alertsQuery = useAlerts();
  const historyQuery = useReadinessHistory(7);
  const rosterQuery = useTrainingRoster();
  const gamificationQuery = useGamificationSummary();
  const achievementsQuery = useAchievements();
  const contextQuery = useMissionContext();
  const tapeQuery = useMissionTape(tapeDays);
  const domainQuery = useDomainDetail(selectedDomain);
  const acknowledge = useAcknowledgeAlert();
  const updateProfile = useUpdateMissionProfile();
  const captureQuery = useCaptureFeed();
  const surgeonUpdatesQuery = useSurgeonUpdates();
  const hasCachedDashboard =
    missionQuery.data !== undefined && readinessQuery.data !== undefined;

  if (missionQuery.isLoading || readinessQuery.isLoading || alertsQuery.isLoading) {
    return (
      <FlightDeckLoading
        name={user ? firstName(user.full_name) : "Commander"}
        mission={missionQuery.data}
      />
    );
  }

  // Alerts are handled locally so an alerts outage does not blank the whole
  // dashboard; the rest of the readiness view can still render.
  const error = missionQuery.error ?? readinessQuery.error;
  if (!online && !hasCachedDashboard) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
        <Panel title="Offline" className="w-full">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-watch-soft text-watch">
              <WifiOff size={18} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                The Flight Deck is waiting for a connection.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                Your check-in drafts and queued submissions are safe on this device. The last
                readings will refresh automatically when the link returns.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void missionQuery.refetch();
                    void readinessQuery.refetch();
                    void alertsQuery.refetch();
                  }}
                >
                  <RefreshCw size={12} aria-hidden />
                  Try again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/check-in")}>
                  Start a check-in
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (error && online) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
        <div className="card-shadow w-full rounded-xl border border-line bg-surface p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-critical-soft text-critical">
            <RefreshCw size={20} aria-hidden />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
            We could not load your health data
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            {error instanceof Error ? error.message : "Check the API and try again."}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void missionQuery.refetch();
              void readinessQuery.refetch();
              void alertsQuery.refetch();
              void historyQuery.refetch();
              void contextQuery.refetch();
              void tapeQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const mission = missionQuery.data;
  if (mission === undefined) {
    return <PageSkeleton />;
  }
  if (mission === null) {
    return (
      <PagePlaceholder
        icon={Orbit}
        title="No mission assigned"
        description="No crew or mission is linked to this view yet. Run make reset-demo to restore the seeded Mars transit."
        phase="Crew assignment"
      />
    );
  }

  const readiness = readinessQuery.data;
  const alerts = alertsQuery.data ?? [];
  const alertsError = alertsQuery.isError && !(!online && alertsQuery.data !== undefined);
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const context = contextQuery.data;
  const name = user ? firstName(user.full_name) : "Commander";
  const status = readiness ? asStatus(readiness.status) : "unknown";
  const day = Math.max(1, Math.floor(mission.met_seconds / 86400));
  const domainScores = readiness?.domain_scores ?? {};
  const previousDomainScores = historyQuery.data?.[1]?.domain_scores;
  const keyFactorCodes = ["hrv_rmssd", "sleep_efficiency_pct", "hydration_l"];
  const preferredFactors = keyFactorCodes
    .map((code) => readiness?.factors.find((factor) => factor.metric === code))
    .filter((factor): factor is ReadinessFactor => Boolean(factor));
  const displayFactors = [
    ...preferredFactors,
    ...(readiness?.factors.filter(
      (factor) => !preferredFactors.some((preferred) => preferred.metric === factor.metric),
    ) ?? []),
  ].slice(0, 3);

  const domainStatus = (key: string): Status => {
    const score = domainScores[key];
    return score === undefined ? "unknown" : statusFromScore(score);
  };

  const domainDelta = (key: string): number | undefined => {
    const current = domainScores[key];
    const previous = previousDomainScores?.[key];
    if (current === undefined || previous === undefined) return undefined;
    return Math.round((current - previous) * 10) / 10;
  };

  const selectDomain = (key: string) => {
    setSelectedDomain(key);
  };

  const acknowledgeAlert = (alertId: number) => {
    acknowledge.mutate(alertId, {
      onSuccess: () => toast.success("Alert acknowledged."),
      onError: () => toast.error("Unable to acknowledge the alert."),
    });
  };

  const changeProfile = (profile: MissionProfile) => {
    updateProfile.mutate(profile, {
      onSuccess: (updated) =>
        toast.success(`Mission environment set to ${profileLabel(updated.profile)}.`),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Unable to change the mission environment.",
        ),
    });
  };

  const anatomyRegions = {
    cardiovascular: {
      label: "Chest & heart",
      status: domainStatus("cardiovascular"),
    },
    musculoskeletal: {
      label: "Muscles & bone",
      status: domainStatus("musculoskeletal"),
    },
    metabolic: {
      label: "Core & metabolism",
      status: domainStatus("metabolic"),
    },
    neurobehavioral: {
      label: "Head & cognition",
      status: domainStatus("neurobehavioral"),
    },
    immune: {
      label: "Whole body",
      status: domainStatus("immune"),
    },
    sleep: {
      label: "Sleep & circadian",
      status: domainStatus("sleep"),
    },
  };

  const capture = captureQuery.data;
  const surgeonUpdates = surgeonUpdatesQuery.data;
  const openInstructions = surgeonUpdates?.instructions.filter(
    (instruction) => instruction.status === "open",
  ) ?? [];
  const alertStatus: Status = alerts.some((alert) => alert.severity === "critical")
    ? "critical"
    : alerts.some((alert) => alert.severity === "caution")
      ? "caution"
      : alerts.length > 0
        ? "watch"
        : "nominal";
  const weather = context?.latest_event;
  const nextAction =
    alertsError
      ? "Alerts are unavailable. Check the connection."
      : (alerts[0]?.recommended_action ??
        "Continue your current countermeasure plan.");
  const healthSummary =
    status === "critical"
      ? "Needs attention now"
      : status === "caution"
        ? "A few systems need attention"
        : status === "watch"
          ? "Mostly steady"
          : "All systems steady";

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {greeting()}, {name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
          Mission health
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mission.crew_name} · Day {day} · {profileLabel(mission.profile)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => navigate("/check-in")}>
          Systems check
          <ArrowRight size={14} aria-hidden />
        </Button>
        <Button variant="secondary" onClick={() => setDetail("vitals")}>
          <Radio size={13} aria-hidden />
          Capture
        </Button>
      </div>
    </div>
  );

  if (!readiness) {
    return (
      <div>
        {header}
        <div className="mt-5 rounded-3xl border border-line bg-surface p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <HeartPulse size={24} aria-hidden />
          </span>
          <h2 className="mt-3 text-xl font-semibold text-ink">No readiness score yet</h2>
          <p className="mt-1 text-sm text-muted">Complete a Systems Check to establish your baseline.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate("/check-in")}>
            Start Systems Check
          </Button>
        </div>
      </div>
    );
  }

  const tapeEvents = (tapeQuery.data ?? []).map((event) => ({
    id: event.id,
    day: event.day,
    type: event.type as TapeEventType,
    label: event.label,
    status: event.status ? asStatus(event.status) : undefined,
  }));

  const trendScores = [...(historyQuery.data ?? [])].reverse().map((snapshot) => snapshot.score);
  const trend = trendScores.length > 0 ? trendScores : [readiness.score];
  const trendDelta = readiness.score - trend[0];

  return (
    <div>
      {header}

      {criticalAlerts.length > 0 && (
        <button
          type="button"
          onClick={() => setDetail("alerts")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-critical px-4 py-3 text-left text-white shadow-[0_10px_30px_rgba(185,28,28,0.22)] transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <AlertTriangle size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
              Critical · {criticalAlerts.length} alert{criticalAlerts.length === 1 ? "" : "s"}
            </span>
            <span className="block truncate text-sm font-semibold">
              {criticalAlerts[0].title}
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0" aria-hidden />
        </button>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <button
          type="button"
          onClick={() => setDetail("readiness")}
          className="group relative min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-4 text-left shadow-[0_1px_2px_rgba(10,42,92,0.04),0_16px_40px_rgba(10,42,92,0.06)] transition-transform duration-150 hover:-translate-y-0.5 lg:col-span-8 lg:p-6"
        >
          <span
            className={cn(
              "absolute inset-x-0 top-0 h-1.5",
              status === "critical"
                ? "bg-critical"
                : status === "caution"
                  ? "bg-caution"
                  : status === "watch"
                    ? "bg-watch"
                    : "bg-nominal",
            )}
          />
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <ReadinessRing
              score={readiness.score}
              status={status}
              size={210}
              strokeWidth={10}
              label="Score"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Readiness</h2>
                <StatusPill status={status} />
              </div>
              <p className="mt-1 text-sm text-muted">{healthSummary}</p>

              <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-3">
                {displayFactors.map((factor) => (
                  <FactorStat key={factor.metric} factor={factor} />
                ))}
              </div>

              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                Open full breakdown
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-muted/70 px-3 py-2">
            <Sun size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-2">
              <span className="font-semibold text-ink">Next: </span>
              {nextAction}
            </p>
          </div>
        </button>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:col-span-4">
          <QuickTile
            icon={HeartPulse}
            label="Body systems"
            meta={STATUS_META[status].label}
            status={domainStatus("cardiovascular")}
            onClick={() => setDetail("body")}
          />
          <QuickTile
            icon={AlertTriangle}
            label="Needs attention"
            meta={alertsError ? "Unavailable" : `${alerts.length} active`}
            status={alertStatus}
            onClick={() => setDetail("alerts")}
          />
          <QuickTile
            icon={Radio}
            label="Vitals"
            meta={capture ? `${capture.metrics.length} readings` : "No capture"}
            status={capture ? "nominal" : "unknown"}
            onClick={() => setDetail("vitals")}
          />
          <QuickTile
            icon={Stethoscope}
            label="Flight Surgeon"
            meta={
              openInstructions.length > 0
                ? `${openInstructions.length} request${openInstructions.length === 1 ? "" : "s"}`
                : "No open requests"
            }
            status={openInstructions.length > 0 ? "watch" : "nominal"}
            onClick={() => setDetail("surgeon")}
          />
          <QuickTile
            icon={ScrollText}
            label="Mission tape"
            meta={`${tapeDays} days`}
            accent
            onClick={() => setDetail("tape")}
          />
          <QuickTile
            icon={CloudSun}
            label="Space weather"
            meta={
              weather
                ? `${titleCase(weather.severity)} · ${context?.active ? "active" : "past"}`
                : "No event"
            }
            status={weather ? weatherStatus(weather.severity) : "unknown"}
            onClick={() => setDetail("weather")}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="7-day trend"
          actions={<StatusPill status={status} />}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold leading-none tabular tracking-tight text-ink">
                {readiness.score.toFixed(0)}
              </p>
              <p className="mt-1 text-[10px] text-muted">readiness today</p>
            </div>
            <p
              className={cn(
                "pb-0.5 text-[11px] font-semibold tabular",
                trendDelta >= 0 ? "text-nominal" : "text-caution",
              )}
            >
              {trendDelta >= 0 ? "+" : ""}
              {trendDelta.toFixed(1)} pts · 7 days
            </p>
          </div>

          <Sparkline
            values={trend}
            status={status}
            color="#0B3D91"
            width={420}
            height={72}
            fill
            strokeWidth={2.5}
            className="mt-3 w-full"
          />
          <div className="mt-1 flex justify-between text-[9px] text-muted">
            <span>7 days ago</span>
            <span>Today</span>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Since last check
              </p>
              <button
                type="button"
                onClick={() => navigate("/telemetry")}
                className="text-[10px] font-medium text-accent hover:text-accent-strong"
              >
                Telemetry
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DOMAIN_ROWS.map((domain) => ({
                ...domain,
                delta: domainDelta(domain.key) ?? 0,
              }))
                .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                .slice(0, 3)
                .map((domain) => (
                  <div
                    key={domain.key}
                    className="min-w-0 rounded-xl border border-line bg-surface-muted/50 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          STATUS_META[domainStatus(domain.key)].dot,
                        )}
                      />
                      <p className="truncate text-[9px] text-muted sm:hidden">
                        {DOMAIN_SHORT[domain.key] ?? domain.name}
                      </p>
                      <p className="hidden truncate text-[9px] text-muted sm:block">
                        {domain.name}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold tabular",
                        domain.delta >= 0 ? "text-nominal" : "text-caution",
                      )}
                    >
                      {domain.delta > 0 ? "+" : ""}
                      {domain.delta.toFixed(1)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="Today"
          actions={
            <button
              type="button"
              onClick={() => navigate("/training")}
              className="text-[10px] font-medium text-accent hover:text-accent-strong"
            >
              Open training
            </button>
          }
        >
          {rosterQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rosterQuery.data ? (
            <DutyRoster
              roster={rosterQuery.data}
              onLog={(code) => navigate(`/training?item=${code}`)}
              onCheckin={() => navigate("/check-in")}
            />
          ) : (
            <p className="rounded-xl bg-surface-muted px-3 py-3 text-[11px] text-muted">
              Today&apos;s roster is unavailable.
            </p>
          )}
        </Panel>
      </div>

      <MomentumCard
        summary={gamificationQuery.data}
        achievements={achievementsQuery.data ?? []}
        onOpen={() => navigate("/log")}
      />

      <DetailSheet
        open={detail === "readiness"}
        onClose={() => setDetail(null)}
        title="Readiness breakdown"
        subtitle="Six domains, one composite score."
        icon={HeartPulse}
        size="lg"
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <ReadinessRing
            score={readiness.score}
            status={status}
            size={190}
            label="Score"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-ink-2">{healthSummary}</p>
            <div className="mt-3 rounded-xl bg-surface-muted px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Next action
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">{nextAction}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => navigate("/check-in")}>
                Log check-in
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/triage")}>
                Triage
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Contributing factors</h3>
            <span className="text-[10px] text-muted">{readiness.factors.length}</span>
          </div>
          <div className="mt-2 divide-y divide-line">
            {readiness.factors.map((factor) => (
              <div key={factor.metric} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-ink">{factor.label}</p>
                  <p className="text-[10px] text-muted">z {factor.z}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[12px] tabular text-ink">
                    {displayMetricValue(factor.value)}
                    {factor.unit && <span className="ml-1 text-[10px] text-muted">{factor.unit}</span>}
                  </p>
                  <p
                    className={cn(
                      "w-9 text-right text-[10px] tabular",
                      factor.contribution < 0 ? "text-caution" : "text-nominal",
                    )}
                  >
                    {factor.contribution > 0 ? "+" : ""}
                    {factor.contribution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {user?.role === "commander" && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="text-[11px] text-muted">Environment</span>
            <select
              aria-label="Mission environment profile"
              value={mission.profile}
              disabled={updateProfile.isPending}
              onChange={(event) => changeProfile(event.target.value as MissionProfile)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink disabled:opacity-60"
            >
              <option value="mars_transit">Mars transit</option>
              <option value="lunar_surface">Lunar surface</option>
              <option value="station">Space station</option>
            </select>
            {updateProfile.isPending && <span className="text-[10px] text-muted">Updating…</span>}
          </div>
        )}
      </DetailSheet>

      <DetailSheet
        open={detail === "body"}
        onClose={() => setDetail(null)}
        title="Body systems"
        subtitle="Skin, muscle, and bone. Tap a region."
        icon={HeartPulse}
        size="xl"
      >
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="min-w-0 lg:col-span-4">
            <AnatomyMap
              regions={anatomyRegions}
              selectedDomain={selectedDomain}
              onSelectDomain={selectDomain}
            />
          </div>
          <div className="min-w-0 space-y-3 lg:col-span-3">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Systems</h3>
                <span className="text-[10px] text-muted">6 domains</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {DOMAIN_ROWS.map((domain) => (
                  <DomainRail
                    key={domain.key}
                    name={domain.name}
                    score={domainScores[domain.key] ?? 0}
                    status={domainStatus(domain.key)}
                    delta={domainDelta(domain.key)}
                    active={selectedDomain === domain.key}
                    onClick={() => selectDomain(domain.key)}
                  />
                ))}
              </div>
            </div>
            <StatusLegend />
            <DomainDetailPanel
              detail={domainQuery.data}
              loading={domainQuery.isLoading}
              error={domainQuery.isError && !(!online && domainQuery.data !== undefined)}
              onRetry={() => void domainQuery.refetch()}
              onViewTrend={() => navigate(`/telemetry/domain/${selectedDomain}`)}
            />
          </div>
        </div>
      </DetailSheet>

      <DetailSheet
        open={detail === "alerts"}
        onClose={() => setDetail(null)}
        title="Needs attention"
        subtitle={alertsError ? "Alerts are unavailable" : `${alerts.length} active`}
        icon={AlertTriangle}
        size="lg"
      >
        {alertsError ? (
          <div className="rounded-2xl border border-watch/30 bg-watch-soft p-4">
            <p className="text-sm font-semibold text-watch">Alerts could not be loaded.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-watch">
              This is not an all-clear. Check the connection before relying on the dashboard.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void alertsQuery.refetch()}
            >
              Retry alerts
            </Button>
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <CompactAlert
                key={alert.id}
                alert={alert}
                defaultOpen
                onAcknowledge={() => acknowledgeAlert(alert.id)}
                onViewGuidance={
                  alert.knowledge_slug
                    ? () => navigate(`/library/${alert.knowledge_slug}`)
                    : undefined
                }
                onOpenCountermeasure={
                  alert.countermeasure
                    ? () => navigate(`/training?item=${alert.countermeasure?.code}`)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-nominal/30 bg-nominal-soft p-5 text-center">
            <Check size={22} className="mx-auto text-nominal" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-ink">No active alerts</p>
            <p className="text-[11px] text-muted">Keep the current routine.</p>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => navigate("/triage")}>
            Open triage protocol
          </Button>
        </div>
      </DetailSheet>

      <DetailSheet
        open={detail === "vitals"}
        onClose={() => setDetail(null)}
        title="Sensor capture"
        subtitle="Automatic habitat and suit readings."
        icon={Radio}
        size="lg"
      >
        <CaptureStrip className="mt-0" />
        {capture && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {capture.metrics.map((metric) => (
              <div key={metric.metric_code} className="rounded-xl bg-surface-muted px-3 py-2.5">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {metric.name}
                </p>
                <p className="mt-1 text-lg font-semibold tabular text-ink">
                  {displayMetricValue(metric.value)}
                  <span className="ml-1 text-[10px] font-normal text-muted">{metric.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => navigate("/telemetry")}>
            Open telemetry
          </Button>
        </div>
      </DetailSheet>

      <DetailSheet
        open={detail === "surgeon"}
        onClose={() => setDetail(null)}
        title="Flight Surgeon"
        subtitle="Earth-side guidance and requests."
        icon={Stethoscope}
        size="lg"
      >
        <SurgeonUpdatesPanel />
      </DetailSheet>

      <DetailSheet
        open={detail === "tape"}
        onClose={() => setDetail(null)}
        title="Mission tape"
        subtitle={`Last ${tapeDays} days`}
        icon={ScrollText}
        size="lg"
      >
        <div className="mb-3 flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
          {([7, 30] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTapeDays(value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                tapeDays === value ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
              )}
            >
              {value} days
            </button>
          ))}
        </div>
        {tapeQuery.isLoading && !tapeQuery.data ? (
          <Skeleton className="h-24 w-full" />
        ) : tapeQuery.isError && !tapeQuery.data ? (
          <p className="text-sm text-ink-2">Unable to load the mission tape.</p>
        ) : (
          <MissionTape events={tapeEvents} maxDay={tapeDays} />
        )}
      </DetailSheet>

      <DetailSheet
        open={detail === "weather"}
        onClose={() => setDetail(null)}
        title="Space weather"
        subtitle="Mission environment context."
        icon={CloudSun}
        size="md"
      >
        {weather ? (
          <div className={cn("rounded-2xl border p-4", STATUS_META[weatherStatus(weather.severity)].surface)}>
            <div className="flex items-center gap-2">
              <Sun size={16} className={STATUS_META[weatherStatus(weather.severity)].text} aria-hidden />
              <p className="text-sm font-semibold text-ink">{weather.kind}</p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{weather.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <span>{titleCase(weather.severity)}</span>
              <span>·</span>
              <span>{context?.active ? "Active now" : "Past event"}</span>
              <span>·</span>
              <span>{context?.source === "live" ? "Live NASA DONKI" : "Demo fixture"}</span>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            No space-weather event in the current window.
          </p>
        )}
      </DetailSheet>
    </div>
  );
}
