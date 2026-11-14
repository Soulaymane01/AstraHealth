import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Download,
  Dumbbell,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { CreditChip, RankBadge } from "@/components/ui/RankBadge";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge, StatusPill } from "@/components/ui/Status";
import { useCheckinReport } from "@/features/checkin/queries";
import { AchievementTile } from "@/features/gamification/components/AchievementTile";
import { StreakTile } from "@/features/gamification/components/StreakTile";
import type { CheckinReport } from "@/lib/api/types";
import { asStatus, STATUS_META } from "@/lib/status";
import { cn, displayMetricValue, formatSigned } from "@/lib/utils";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Just now";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function downloadReport(report: CheckinReport): void {
  const payload = {
    exported_at: new Date().toISOString(),
    source: "AstraHealth Systems Report",
    note: "Guidance, not a diagnosis. Simulated demo data unless entered by the user.",
    report,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `astrahealth-checkin-${report.checkin_id}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CheckinReportPage() {
  const navigate = useNavigate();
  const params = useParams<{ checkinId: string }>();
  const parsedId = Number(params.checkinId);
  const checkinId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const reportQuery = useCheckinReport(checkinId);

  if (reportQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <QueryError
        title="Systems Report unavailable"
        message={
          reportQuery.error instanceof Error
            ? reportQuery.error.message
            : "The check-in may not exist, or it belongs to another account."
        }
        onRetry={() => void reportQuery.refetch()}
        retrying={reportQuery.isFetching}
      />
    );
  }

  const report = reportQuery.data;
  const status = report.status ? asStatus(report.status) : null;
  const previousStatus = report.previous_status ? asStatus(report.previous_status) : null;
  const actionSource =
    report.alerts.length > 0
      ? "From your highest-severity active alert."
      : report.top_factors.length > 0
        ? "Based on the largest factor in this check-in."
        : "Keep building your baseline.";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Systems Report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            {report.insufficient_data ? "Readings saved." : "Check-in complete."}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {formatDateTime(report.completed_at)} · Check-in #{report.checkin_id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} aria-hidden />
            Print / Save PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => downloadReport(report)}>
            <Download size={13} aria-hidden />
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/check-in")}>
            <Plus size={13} aria-hidden />
            Start another check-in
          </Button>
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Recommended next action"
        subtitle="One action for the next 24 hours."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm leading-relaxed text-ink">{report.recommended_action}</p>
          <Button
            variant="primary"
            className="shrink-0 sm:self-center"
            onClick={() => navigate("/")}
          >
            Back to Flight Deck
            <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted">{actionSource}</p>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {report.score !== null && status ? (
            <Panel
              title="Readiness"
              subtitle="Composite score across six domains."
              actions={<StatusPill status={status} />}
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <ReadinessRing
                  score={report.score}
                  status={status}
                  size={176}
                  className="shrink-0 self-center"
                />

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="rounded-lg bg-surface-muted px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted">
                      Change since previous check-in
                    </p>
                    {report.score_delta !== null ? (
                      <p
                        className={cn(
                          "mt-0.5 text-xl font-semibold tabular",
                          report.score_delta >= 0 ? "text-nominal" : "text-caution",
                        )}
                      >
                        {formatSigned(report.score_delta, 1)}{" "}
                        <span className="text-xs font-normal text-muted">points</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-ink-2">First scored check-in</p>
                    )}
                    {report.previous_score !== null && (
                      <p className="mt-1 text-[11px] text-muted">
                        Previous score {displayMetricValue(report.previous_score)}
                      </p>
                    )}
                  </div>

                  {report.status_changed && previousStatus ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted">Status changed</span>
                      <StatusBadge status={previousStatus} />
                      <ArrowRight size={12} className="text-muted" aria-hidden />
                      <StatusBadge status={status} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      {report.previous_status
                        ? "Status unchanged from the previous check-in."
                        : "This is the first scored snapshot for this account."}
                    </p>
                  )}

                  <p className="text-[11px] leading-relaxed text-muted">
                    Computed {formatDateTime(report.computed_at)} against your 21-day baseline.
                  </p>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Readiness" subtitle="Not enough baseline data yet.">
              <div className="flex items-start gap-3 rounded-lg bg-surface-muted px-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-unknown">
                  <CircleHelp size={18} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">Insufficient data for a score</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                    Your readings were saved. A readiness score needs at least three readings in the
                    21-day window that ends three days before today. This check-in counts toward
                    that baseline.
                  </p>
                  {report.previous_score !== null && (
                    <p className="mt-2 text-xs text-muted">
                      Last scored check-in: {displayMetricValue(report.previous_score)}
                      {previousStatus ? ` · ${STATUS_META[previousStatus].label}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Top factors" subtitle="The readings that moved this score the most.">
            {report.top_factors.length > 0 ? (
              <div className="divide-y divide-line">
                {report.top_factors.map((factor) => (
                  <div
                    key={factor.metric}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{factor.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {Math.abs(factor.z).toFixed(1)} SD {factor.z < 0 ? "below" : "above"} your
                        baseline
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-sm tabular text-ink">
                        {displayMetricValue(factor.value)}
                        {factor.unit && (
                          <span className="ml-1 text-[11px] font-normal text-muted">
                            {factor.unit}
                          </span>
                        )}
                      </p>
                      <p
                        className={cn(
                          "w-12 text-right text-[11px] tabular",
                          factor.contribution < 0 ? "text-caution" : "text-nominal",
                        )}
                      >
                        {formatSigned(factor.contribution, 1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-surface-muted px-3 py-3 text-[13px] text-muted">
                No factor breakdown is available for this check-in.
              </p>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Contribution is the estimated effect on the composite score, in points.
            </p>
          </Panel>

          <Panel title="Notes & skipped steps" subtitle="Context stored with this check-in.">
            {report.notes ? (
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                {report.notes}
              </p>
            ) : (
              <p className="text-[13px] text-muted">No notes or skipped steps.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Panel title="Credits" subtitle="Awarded exactly once per check-in.">
            {report.credits > 0 ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold tabular text-ink">+{report.credits}</p>
                    <p className="text-[11px] text-muted">Flight Credits</p>
                  </div>
                  <CreditChip amount={report.credits} showLabel className="text-sm" />
                </div>
                <p className="mt-2 text-[10px] text-muted">
                  Credits appear in your ledger when the check-in commits.
                </p>
              </>
            ) : (
              <p className="text-[13px] text-muted">No credits recorded for this check-in.</p>
            )}
          </Panel>

          {report.new_achievements.length > 0 && (
            <Panel
              title="New achievement"
              subtitle="Unlocked with this check-in."
              className="border-accent/30 bg-accent-soft/30"
            >
              <div className="space-y-2">
                {report.new_achievements.map((achievement) => (
                  <AchievementTile key={achievement.code} achievement={achievement} />
                ))}
              </div>
            </Panel>
          )}

          <RankBadge
            rank={report.rank.rank}
            credits={report.current_balance}
            nextRank={report.rank.next_rank ?? undefined}
            progress={report.rank.progress}
          />

          {report.streak && <StreakTile label="Systems Check streak" streak={report.streak} />}

          <Panel
            title="Active alerts"
            subtitle="Across all recent check-ins."
            actions={<span className="text-xs text-muted">{report.alerts.length}</span>}
          >
            {report.alerts.length > 0 ? (
              <>
                <ul className="space-y-2">
                  {report.alerts.map((alert) => {
                    const alertStatus = asStatus(alert.severity);
                    return (
                      <li
                        key={alert.id}
                        className="rounded-lg border border-line bg-surface px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge status={alertStatus} />
                          <span className="text-[10px] text-muted">Active</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-ink">{alert.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">
                          {alert.rationale}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          {alert.countermeasure && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/training?item=${alert.countermeasure?.code}`)
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-strong"
                            >
                              <Dumbbell size={10} aria-hidden />
                              Countermeasure: {alert.countermeasure.name}
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
                    );
                  })}
                </ul>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate("/")}
                >
                  Acknowledge on the Flight Deck
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-ink-2">
                <ShieldCheck size={14} className="text-nominal" aria-hidden />
                No active alerts.
              </div>
            )}
          </Panel>

          <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-muted/60 px-3 py-2.5 text-[10px] leading-relaxed text-muted">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>
              Guidance only, not a diagnosis. If a red flag is present, follow the mission emergency
              procedure and contact the flight surgeon.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
