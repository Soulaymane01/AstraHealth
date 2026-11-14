import {
  AlertTriangle,
  ArrowRight,
  Check,
  Dumbbell,
  Orbit,
  RefreshCw,
  Sun,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AnatomyMap } from "@/components/ui/AnatomyMap";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { DomainRail } from "@/components/ui/DomainRail";
import { MissionTape, type TapeEventType } from "@/components/ui/MissionTape";
import { Panel } from "@/components/ui/Panel";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusLegend, StatusPill } from "@/components/ui/Status";
import { useAcknowledgeAlert, useAlerts } from "@/features/alerts/queries";
import { useAuthStore } from "@/features/auth/auth-store";
import { CaptureStrip } from "@/features/captures/CaptureStrip";
import { SurgeonUpdatesPanel } from "@/features/surgeon/SurgeonUpdatesPanel";
import { readClinical } from "@/features/offline/clinical-cache";
import { useOfflineStore } from "@/features/offline/store";
import {
  useMission,
  useMissionContext,
  useMissionTape,
  useUpdateMissionProfile,
  type MissionProfile,
} from "@/features/mission/queries";
import { useDomainDetail, useReadiness, useReadinessHistory } from "@/features/readiness/queries";
import { PagePlaceholder } from "@/features/shared/PagePlaceholder";
import type { Alert, DomainDetail, Readiness, SpaceWeatherEvent } from "@/lib/api/types";
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

function ContextStrip({
  event,
  active,
  source,
}: {
  event: SpaceWeatherEvent;
  active: boolean;
  source?: string;
}) {
  const meta = STATUS_META[weatherStatus(event.severity)];
  const live = source === "live";
  const time = active
    ? "Active now"
    : event.end_at
      ? `Ended ${formatRelativeTime(event.end_at)}`
      : formatRelativeTime(event.start_at);

  return (
    <Disclosure
      className="mt-3 rounded-xl border border-line bg-surface px-4 py-2.5"
      summary={
        <span className="flex flex-wrap items-center gap-2 text-[11px]">
          <Sun size={13} className={cn("shrink-0", meta.text)} aria-hidden />
          <span className={cn("font-medium", meta.text)}>
            Space weather · {titleCase(event.severity)}
          </span>
          <span className="text-muted">{time}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              live ? "bg-accent-soft text-accent" : "bg-surface-muted text-muted",
            )}
          >
            {live ? "Live NASA DONKI" : "Demo fixture"}
          </span>
        </span>
      }
      meta="Details"
      bodyClassName="rounded-lg bg-surface-muted/60 px-3 py-2"
    >
      <p className="text-sm font-medium text-ink">{event.kind}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">{event.summary}</p>
      <p className="mt-1 text-[10px] text-muted">
        {live
          ? "Fetched from NASA DONKI."
          : "Seeded demo event; set NASA_API_KEY for live DONKI context."}
      </p>
    </Disclosure>
  );
}

type ReadinessFactor = Readiness["factors"][number];

function factorDirection(factor: ReadinessFactor): string {
  if (factor.metric === "sleep_duration_h") return "Short";
  if (factor.metric === "hydration_l") return "Low";
  if (factor.metric === "sleep_efficiency_pct") return "Below";
  return factor.z < 0 ? "Below" : "Above";
}

function KeyFactorTile({
  factor,
  onClick,
}: {
  factor: ReadinessFactor;
  onClick: () => void;
}) {
  const negative = factor.contribution < 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-xl bg-surface-muted/65 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">
        {factor.label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular tracking-tight text-ink">
        {displayMetricValue(factor.value)}
        {factor.unit && <span className="ml-1 text-[10px] font-normal text-muted">{factor.unit}</span>}
      </p>
      <p
        className={cn(
          "mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium",
          negative ? "text-caution" : "text-nominal",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", negative ? "bg-caution" : "bg-nominal")} />
        {factorDirection(factor)}
      </p>
    </button>
  );
}

function CompactAlert({
  alert,
  onAcknowledge,
  onViewGuidance,
  onOpenCountermeasure,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onViewGuidance?: () => void;
  onOpenCountermeasure?: () => void;
}) {
  const status = asStatus(alert.severity);
  return (
    <div data-testid="alert-row" className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <Disclosure
        defaultOpen={alert.severity === "critical"}
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

function CriticalTriageBanner({
  count,
  title,
  onOpen,
}: {
  count: number;
  title: string;
  onOpen: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-critical/30 bg-critical-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-critical">
            {count} critical alert{count === 1 ? "" : "s"} active
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-critical">
            {title}. Follow the emergency protocol now.
          </p>
        </div>
      </div>
      <Button variant="danger" size="sm" className="shrink-0" onClick={onOpen}>
        Open triage protocol
        <ArrowRight size={13} aria-hidden />
      </Button>
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

export function FlightDeckPage() {
  const user = useAuthStore((state) => state.user);
  const online = useOfflineStore((state) => state.online);
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState("cardiovascular");
  const [tapeDays, setTapeDays] = useState<7 | 30>(30);

  const missionQuery = useMission();
  const readinessQuery = useReadiness();
  const alertsQuery = useAlerts();
  const historyQuery = useReadinessHistory(2);
  const contextQuery = useMissionContext();
  const tapeQuery = useMissionTape(tapeDays);
  const domainQuery = useDomainDetail(selectedDomain);
  const acknowledge = useAcknowledgeAlert();
  const updateProfile = useUpdateMissionProfile();
  const hasCachedDashboard =
    missionQuery.data !== undefined && readinessQuery.data !== undefined;
  const cachedReadiness = readClinical<Readiness | null>(user?.id, "readiness");

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
        description="Your account is active, but no crew or mission is linked yet. Sign in with a demo account to explore the seeded Mars transit."
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

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted">
          {greeting()}, {name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Mission health overview
        </h1>
        <p className="mt-1.5 truncate text-sm text-ink-2">
          {status === "nominal" ? "Your systems are steady." : "A few systems need attention."}
        </p>
        <p
          className="truncate text-sm text-ink-2"
          title={`${mission.crew_name} · Day ${day} · ${profileLabel(mission.profile)}`}
        >
          {mission.crew_name} · Day {day} · {profileLabel(mission.profile)}
        </p>
        {user?.role === "commander" && (
          <label className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>Environment</span>
            <select
              aria-label="Mission environment profile"
              value={mission.profile}
              disabled={updateProfile.isPending}
              onChange={(event) => changeProfile(event.target.value as MissionProfile)}
              className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-60"
            >
              <option value="mars_transit">Mars transit</option>
              <option value="lunar_surface">Lunar surface</option>
              <option value="station">Space station</option>
            </select>
            {updateProfile.isPending && <span aria-live="polite">Updating…</span>}
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => navigate("/check-in")}>
          Start systems check
          <ArrowRight size={14} aria-hidden />
        </Button>
        <Button variant="secondary" onClick={() => navigate("/telemetry")}>
          View telemetry
        </Button>
      </div>
    </div>
  );

  if (!readiness) {
    return (
      <div>
        {header}
        {context?.latest_event && (
          <ContextStrip
            event={context.latest_event}
            active={context.active}
            source={context.source}
          />
        )}
        {criticalAlerts.length > 0 && (
          <CriticalTriageBanner
            count={criticalAlerts.length}
            title={criticalAlerts[0].title}
            onOpen={() => navigate("/triage")}
          />
        )}
        <CaptureStrip />
        <Panel
          className="mt-6"
          title="Readiness"
          subtitle="Your first Systems Check creates a snapshot."
        >
          <p className="text-sm leading-relaxed text-ink-2">
            No readiness snapshot exists for this account yet.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => navigate("/check-in")}>
            Start systems check
          </Button>
        </Panel>
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

  return (
    <div>
      {header}

      {context?.latest_event && (
        <ContextStrip
          event={context.latest_event}
          active={context.active}
          source={context.source}
        />
      )}

      {criticalAlerts.length > 0 && (
        <CriticalTriageBanner
          count={criticalAlerts.length}
          title={criticalAlerts[0].title}
          onOpen={() => navigate("/triage")}
        />
      )}

      <CaptureStrip />
      <SurgeonUpdatesPanel />

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Panel
            title="Readiness"
            subtitle={
              !online && cachedReadiness
                ? `Composite score across six domains · last synced ${formatRelativeTime(
                    new Date(cachedReadiness.savedAt).toISOString(),
                  )}`
                : "Composite score across six domains."
            }
            actions={<StatusPill status={status} />}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
              <ReadinessRing
                score={readiness.score}
                status={status}
                size={176}
                factors={readiness.factors.length}
                className="shrink-0 self-center"
              />

              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                {displayFactors.map((factor) => (
                  <KeyFactorTile
                    key={factor.metric}
                    factor={factor}
                    onClick={() => navigate(`/telemetry/metric/${factor.metric}`)}
                  />
                ))}
              </div>
            </div>

            <Disclosure
              className="mt-4 border-t border-line pt-3"
              summary="Why this score?"
              meta={`${readiness.factors.length} factors`}
              summaryClassName="text-[11px] font-medium text-accent"
            >
              <div className="divide-y divide-line">
                {readiness.factors.map((factor) => (
                  <div
                    key={factor.metric}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-ink">{factor.label}</p>
                      <p className="text-[10px] text-muted">z {factor.z}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] tabular text-ink">
                        {displayMetricValue(factor.value)}
                        {factor.unit && (
                          <span className="ml-1 text-[10px] text-muted">{factor.unit}</span>
                        )}
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
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                A negative contribution lowers the composite. A fired rule can override the status
                independently of the score.
              </p>
            </Disclosure>

            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  Next action
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
                  {alertsError
                    ? "Alerts could not be loaded. Check the connection before relying on this view."
                    : (alerts[0]?.recommended_action ??
                      "Continue your current countermeasure plan.")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/check-in")}
                >
                  Log a check-in
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/triage")}>
                  Triage
                </Button>
                {alertsError && (
                  <Button variant="ghost" size="sm" onClick={() => void alertsQuery.refetch()}>
                    Retry alerts
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-2 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">
              Needs attention
            </h2>
            <span className="text-[11px] text-muted">
              {alertsError ? "Unavailable" : `${alerts.length} active`}
            </span>
          </div>

          {alertsError ? (
            <Panel>
              <p className="text-sm font-medium text-ink">Alerts are unavailable.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                This is not an all-clear. Check the connection and retry before relying on the
                dashboard.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void alertsQuery.refetch()}
              >
                Retry alerts
              </Button>
            </Panel>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <CompactAlert
                key={alert.id}
                alert={alert}
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
            ))
          ) : (
            <Panel>
              <p className="text-sm leading-relaxed text-ink-2">
                No active alerts. Keep the current routine.
              </p>
            </Panel>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="Body systems"
          subtitle="Click a region to inspect its domain. Use the Systems list for keyboard selection."
        >
          <AnatomyMap
            regions={anatomyRegions}
            selectedDomain={selectedDomain}
            onSelectDomain={selectDomain}
          />
          <Disclosure
            className="mt-3 border-t border-line pt-3"
            summary={`${anatomyRegions[selectedDomain as keyof typeof anatomyRegions]?.label ?? "Selected region"} · ${
              STATUS_META[domainStatus(selectedDomain)].label
            }`}
            meta="Inspect"
            summaryClassName="text-[11px] font-medium text-ink"
          >
            <StatusLegend className="mb-3" />
            <DomainDetailPanel
              detail={domainQuery.data}
              loading={domainQuery.isLoading}
              error={domainQuery.isError && !(!online && domainQuery.data !== undefined)}
              onRetry={() => void domainQuery.refetch()}
              onViewTrend={() => navigate(`/telemetry/domain/${selectedDomain}`)}
            />
          </Disclosure>
        </Panel>

        <div className="min-w-0 lg:col-span-5">
          <Panel title="Systems" subtitle="Scores relative to your personal baseline.">
            <div className="space-y-0.5">
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
            <p className="mt-3 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
              Sleep and circadian rhythm are tracked as a schedule, not a body region.
            </p>
          </Panel>
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Mission tape"
        subtitle={`Last ${tapeDays} days`}
        actions={
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
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
        }
      >
        {tapeQuery.isLoading && !tapeQuery.data ? (
          <Skeleton className="h-24 w-full" />
        ) : tapeQuery.isError && !tapeQuery.data ? (
          <p className="text-sm text-ink-2">Unable to load the mission tape.</p>
        ) : (
          <MissionTape events={tapeEvents} maxDay={tapeDays} />
        )}
      </Panel>
    </div>
  );
}
