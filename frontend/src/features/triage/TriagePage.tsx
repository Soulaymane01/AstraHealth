import { AlertTriangle, ArrowRight, BookOpen, Check, Copy, Dumbbell, Radio } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusPill } from "@/components/ui/Status";
import { formatCommsWindow, nextCommsWindow } from "@/features/offline/comms";
import { useMission } from "@/features/mission/queries";
import { useAlerts } from "@/features/alerts/queries";
import { useReadiness } from "@/features/readiness/queries";
import { asStatus } from "@/lib/status";
import { displayMetricValue } from "@/lib/utils";

const IMMEDIATE_ACTIONS = [
  "Stop the current activity and sit or lie down. Ask a crewmate to stay with you.",
  "Check airway, breathing, and circulation. Re-measure heart rate, temperature, blood pressure, and oxygen saturation if you can.",
  "Treat chest pain, shortness of breath, fainting, sudden vision loss, fever at or above 38 °C with a heart rate above 100 bpm, or thoughts of self-harm as an emergency.",
  "Contact the flight surgeon on the next comms window. Use the handoff summary below so the ground team gets the facts, not a guess.",
  "Do not take a medication or a dose without the flight surgeon. This tool explains data; it does not prescribe.",
];

function profileLabel(profile: string): string {
  if (profile === "mars_transit") return "Mars transit";
  if (profile === "lunar_surface") return "Lunar surface";
  if (profile === "station") return "Space station";
  return profile;
}

export function TriagePage() {
  const navigate = useNavigate();
  const readinessQuery = useReadiness();
  const alertsQuery = useAlerts();
  const missionQuery = useMission();
  const [copied, setCopied] = useState(false);

  if (readinessQuery.isLoading || alertsQuery.isLoading || missionQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (readinessQuery.isError || alertsQuery.isError || missionQuery.isError) {
    return (
      <QueryError
        title="Triage protocol unavailable"
        message="The latest readiness, alerts, or mission context could not be loaded. Use the emergency procedure and contact the flight surgeon."
        onRetry={() => {
          void readinessQuery.refetch();
          void alertsQuery.refetch();
          void missionQuery.refetch();
        }}
        retrying={
          readinessQuery.isFetching || alertsQuery.isFetching || missionQuery.isFetching
        }
      />
    );
  }

  const readiness = readinessQuery.data;
  const alerts = alertsQuery.data ?? [];
  const mission = missionQuery.data;
  const critical = alerts.filter((alert) => alert.severity === "critical");
  const cautions = alerts.filter((alert) => alert.severity !== "critical");
  const status = readiness ? asStatus(readiness.status) : null;
  const nextWindow = formatCommsWindow(nextCommsWindow());

  const handoff = [
    `AstraHealth handoff — ${new Date().toISOString()}`,
    mission
      ? `Mission: ${mission.crew_name}, day ${Math.max(1, Math.floor(mission.met_seconds / 86400))}, ${profileLabel(mission.profile)}`
      : "Mission: unavailable",
    `Readiness: ${readiness?.score ?? "not scored"} (${readiness?.status ?? "insufficient data"})`,
    `Active alerts: ${
      alerts.length > 0
        ? alerts.map((alert) => `${alert.severity.toUpperCase()} — ${alert.title}`).join("; ")
        : "none"
    }`,
    `Top factors: ${
      readiness?.factors
        .slice(0, 3)
        .map((factor) => `${factor.label} ${displayMetricValue(factor.value)}${factor.unit}`)
        .join("; ") || "none"
    }`,
    `Comms delay: ${mission ? mission.comms_delay_min : "unknown"} min. Next window: ${nextWindow}.`,
    "Guidance only. Not a diagnosis.",
  ].join("\n");

  const copyHandoff = async () => {
    try {
      await navigator.clipboard.writeText(handoff);
      setCopied(true);
      toast.success("Handoff summary copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard unavailable. Select the summary text and copy it manually.");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-critical">Emergency</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Triage protocol
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            A calm, ordered response for a red-flag finding. Guidance, not diagnosis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status && <StatusPill status={status} />}
          <Button variant="secondary" size="sm" onClick={() => navigate("/check-in")}>
            Start a check-in
            <ArrowRight size={13} aria-hidden />
          </Button>
        </div>
      </div>

      {critical.length > 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-critical/30 bg-critical-soft px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-critical">
              {critical.length} critical alert{critical.length === 1 ? "" : "s"} active
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-critical">
              Do not wait for a trend. Follow the immediate actions and contact the flight
              surgeon.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <Check size={16} className="mt-0.5 shrink-0 text-nominal" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-2">
            No critical alert is active. Keep this protocol handy if a red flag appears.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Panel title="Immediate actions" subtitle="Do these in order.">
            <ol className="space-y-3">
              {IMMEDIATE_ACTIONS.map((action, index) => (
                <li key={action} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-critical-soft text-[11px] font-semibold text-critical">
                    {index + 1}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink-2">{action}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              <Button variant="secondary" size="sm" onClick={() => navigate("/library/red-flags")}>
                <BookOpen size={12} aria-hidden />
                Red-flag guidance
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/training")}>
                <Dumbbell size={12} aria-hidden />
                Countermeasures
              </Button>
            </div>
          </Panel>

          <Panel
            title="Active alerts"
            subtitle="Highest severity first."
            actions={<span className="text-xs text-muted">{alerts.length}</span>}
          >
            {alerts.length === 0 ? (
              <p className="rounded-lg bg-surface-muted px-3 py-3 text-[13px] text-muted">
                No active alerts. Keep the current routine and repeat the check tomorrow.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...critical, ...cautions].map((alert) => (
                  <li key={alert.id} className="rounded-lg border border-line px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={asStatus(alert.severity)} />
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-ink">{alert.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">
                      {alert.rationale}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink">
                      {alert.recommended_action}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-3">
                      {alert.countermeasure && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/training?item=${alert.countermeasure?.code}`)
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
                        >
                          <Dumbbell size={10} aria-hidden />
                          {alert.countermeasure.name}
                        </button>
                      )}
                      {alert.knowledge_slug && (
                        <button
                          type="button"
                          onClick={() => navigate(`/library/${alert.knowledge_slug}`)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
                        >
                          <BookOpen size={10} aria-hidden />
                          Read guidance
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Panel
            title="Handoff summary"
            subtitle="Copy this into the flight-surgeon message."
            actions={
              <Button variant="secondary" size="sm" onClick={() => void copyHandoff()}>
                {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            }
          >
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-muted px-3 py-3 text-[11px] leading-relaxed text-ink-2">
              {handoff}
            </pre>
          </Panel>

          <Panel title="Communication" subtitle="The flight surgeon is not in the room.">
            <div className="flex items-start gap-3">
              <Radio size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Next comms window at <span className="font-medium text-ink">{nextWindow}</span>.
                  One-way delay is{" "}
                  <span className="font-medium text-ink">
                    {mission ? `${mission.comms_delay_min} min` : "unknown"}
                  </span>
                  .
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  If the situation is immediately life-threatening, follow the mission emergency
                  procedure first.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Current state" subtitle="What the ground team needs to know.">
            <dl className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Readiness</dt>
                <dd className="font-medium tabular text-ink">
                  {readiness?.score !== null && readiness?.score !== undefined
                    ? `${displayMetricValue(readiness.score)} / 100`
                    : "Insufficient data"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd>{status ? <StatusBadge status={status} /> : "Not scored"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Active alerts</dt>
                <dd className="font-medium tabular text-ink">{alerts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Mission day</dt>
                <dd className="font-medium tabular text-ink">
                  {mission ? Math.max(1, Math.floor(mission.met_seconds / 86400)) : "—"}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
