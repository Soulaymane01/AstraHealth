import { CalendarDays, Flame, ShieldCheck, type LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { DutyRoster } from "@/features/training/components/DutyRoster";
import { LogSessionForm } from "@/features/training/components/LogSessionForm";
import { PlanItemCard } from "@/features/training/components/PlanItemCard";
import { useTrainingPlan, useTrainingRoster } from "@/features/training/queries";
import type { TrainingPlanItem } from "@/lib/api/types";
import { cn, formatRelativeTime } from "@/lib/utils";

function profileLabel(profile: string): string {
  if (profile === "mars_transit") return "Mars transit";
  if (profile === "lunar_surface") return "Lunar surface";
  if (profile === "station") return "Space station";
  return profile.replace("_", " ");
}

function StatPanel({
  label,
  value,
  detail,
  icon: Icon,
  progress,
  className,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  progress?: number;
  className?: string;
}) {
  return (
    <Panel className={cn("min-w-0", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">{label}</p>
        <Icon size={13} className="text-accent" aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-semibold tabular tracking-tight text-ink">{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-muted">{detail}</p>
    </Panel>
  );
}

export function TrainingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planQuery = useTrainingPlan();
  const rosterQuery = useTrainingRoster();

  if (planQuery.isLoading || rosterQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (planQuery.isError || rosterQuery.isError || !planQuery.data || !rosterQuery.data) {
    return (
      <QueryError
        title="Training plan unavailable"
        message="The plan and duty roster could not be loaded."
        onRetry={() => {
          void planQuery.refetch();
          void rosterQuery.refetch();
        }}
        retrying={planQuery.isFetching || rosterQuery.isFetching}
      />
    );
  }

  const plan = planQuery.data;
  const roster = rosterQuery.data;
  const selectedItem = plan.items.find((item) => item.code === searchParams.get("item")) ?? null;
  const trainingItems = plan.items.filter((item) => item.kind === "training");
  const countermeasureItems = plan.items.filter((item) => item.kind === "countermeasure");

  const openLog = (code: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("item", code);
        return next;
      },
      { replace: true },
    );
  };

  const closeLog = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("item");
        return next;
      },
      { replace: true },
    );
  };

  const onLogItem = (item: TrainingPlanItem) => openLog(item.code);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Training</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            The next health action.
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            A weekly plan generated from your active alerts and mission profile. Log what you did;
            the duty roster shows what is next.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted sm:self-auto">
          <CalendarDays size={12} className="text-accent" aria-hidden />
          {profileLabel(plan.profile)} plan
          {!plan.profile_assigned && <span className="text-muted">· default</span>}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPanel
          label="Training adherence"
          value={`${plan.adherence}%`}
          detail={`${plan.training_completed} of ${plan.training_target} prescribed sessions this week`}
          icon={ShieldCheck}
          progress={plan.adherence}
        />
        <StatPanel
          label="Next due"
          value={roster.next_due ? roster.next_due.time : "All clear"}
          detail={roster.next_due ? roster.next_due.title : "Every scheduled item is complete."}
          icon={CalendarDays}
        />
        <StatPanel
          label="Training streak"
          value={`${plan.streak?.current ?? 0} days`}
          detail={
            plan.streak
              ? `Longest ${plan.streak.longest} · ${
                  plan.streak.grace_available ? "grace available" : "grace used"
                }`
              : "Log a session to start a streak."
          }
          icon={Flame}
        />
      </div>

      {selectedItem && (
        <LogSessionForm key={selectedItem.code} item={selectedItem} onClose={closeLog} />
      )}

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <Panel
            title="Training plan"
            subtitle={
              plan.active_countermeasures > 0
                ? `${plan.active_countermeasures} active countermeasure${
                    plan.active_countermeasures === 1 ? "" : "s"
                  } prioritized from alerts.`
                : `${profileLabel(plan.profile)} · prescribed loading for this week.`
            }
          >
            {trainingItems.length === 0 ? (
              <p className="rounded-lg bg-surface-muted px-3 py-3 text-[13px] text-muted">
                No training items are mapped to this mission profile.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {trainingItems.map((item) => (
                  <PlanItemCard key={item.code} item={item} onLog={onLogItem} />
                ))}
              </div>
            )}
            {!plan.profile_assigned && (
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                No mission is assigned to this account. The plan uses Mars transit defaults until a
                crew admin links a mission.
              </p>
            )}
          </Panel>

          <Panel
            title="Daily countermeasures"
            subtitle="Quick checks that protect recovery and the sleep window."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {countermeasureItems.map((item) => (
                <PlanItemCard key={item.code} item={item} onLog={onLogItem} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-4">
          <Panel title="Today's roster" subtitle="Check-in, hydration, training, and sleep.">
            <DutyRoster roster={roster} onLog={openLog} onCheckin={() => navigate("/check-in")} />
          </Panel>

          <Panel title="Recent sessions" subtitle="The last five logged sessions.">
            {plan.recent_sessions.length === 0 ? (
              <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-[11px] text-muted">
                No sessions logged yet. Start with the next due session.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {plan.recent_sessions.map((session) => (
                  <li key={session.id} className="flex items-start justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{session.item_name}</p>
                      <p className="text-[10px] text-muted">
                        {session.duration_min} min
                        {session.rpe !== null ? ` · RPE ${session.rpe}` : ""} ·{" "}
                        {formatRelativeTime(session.completed_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted">{session.domain}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
