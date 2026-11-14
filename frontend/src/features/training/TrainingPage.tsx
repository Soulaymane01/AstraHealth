import { CalendarDays, CalendarPlus, Flame, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { DutyRoster } from "@/features/training/components/DutyRoster";
import { LogSessionForm } from "@/features/training/components/LogSessionForm";
import { PlanItemCard } from "@/features/training/components/PlanItemCard";
import { exportRosterIcs } from "@/features/training/ics";
import { useTrainingPlan, useTrainingRoster } from "@/features/training/queries";
import type { TrainingPlanItem } from "@/lib/api/types";
import { cn, formatRelativeTime } from "@/lib/utils";

function profileLabel(profile: string): string {
  if (profile === "mars_transit") return "Mars transit";
  if (profile === "lunar_surface") return "Lunar surface";
  if (profile === "station") return "Space station";
  return profile.replace("_", " ");
}

const TONES = {
  accent: "border-accent/20 bg-accent-soft",
  nominal: "border-nominal/25 bg-nominal-soft",
  watch: "border-watch/30 bg-watch-soft",
};

function StatPanel({
  label,
  value,
  detail,
  icon: Icon,
  progress,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  progress?: number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border p-3.5", TONES[tone])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <Icon size={14} className="text-muted" aria-hidden />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular tracking-tight text-ink">{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface/70">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      <p className="mt-1 truncate text-[10px] text-muted">{detail}</p>
    </div>
  );
}

export function TrainingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planQuery = useTrainingPlan();
  const rosterQuery = useTrainingRoster();
  const selectedCode = searchParams.get("item");
  const logFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedCode) return;
    const node = logFormRef.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    node.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [selectedCode, planQuery.data]);

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
  const selectedItem = plan.items.find((item) => item.code === selectedCode) ?? null;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Training</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            The next action.
          </h1>
          <p className="mt-1 text-sm text-muted">Plan, roster, and a one-tap log.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted sm:self-auto">
          <CalendarDays size={12} className="text-accent" aria-hidden />
          {profileLabel(plan.profile)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatPanel
          label="Adherence"
          value={`${plan.adherence}%`}
          detail={`${plan.training_completed}/${plan.training_target} sessions`}
          icon={ShieldCheck}
          progress={plan.adherence}
          tone="accent"
        />
        <StatPanel
          label="Next due"
          value={roster.next_due?.time ?? "Clear"}
          detail={roster.next_due?.title ?? "All items complete"}
          icon={CalendarDays}
          tone={roster.next_due ? "watch" : "nominal"}
        />
        <StatPanel
          label="Streak"
          value={`${plan.streak?.current ?? 0}d`}
          detail={plan.streak ? `Longest ${plan.streak.longest} days` : "Start today"}
          icon={Flame}
          tone="watch"
        />
      </div>

      {selectedItem && (
        <div ref={logFormRef} className="scroll-mt-24">
          <LogSessionForm key={selectedItem.code} item={selectedItem} onClose={closeLog} />
        </div>
      )}

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <Panel
            title="Training"
            subtitle={
              plan.active_countermeasures > 0
                ? `${plan.active_countermeasures} alert-linked`
                : "This week"
            }
          >
            {trainingItems.length === 0 ? (
              <p className="rounded-xl bg-surface-muted px-3 py-3 text-[12px] text-muted">
                No training mapped to this profile.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {trainingItems.map((item) => (
                  <PlanItemCard key={item.code} item={item} onLog={onLogItem} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Countermeasures" subtitle="Short recovery actions">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {countermeasureItems.map((item) => (
                <PlanItemCard key={item.code} item={item} onLog={onLogItem} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-4">
          <Panel
            title="Today"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  exportRosterIcs(roster);
                  toast.success("Roster downloaded.");
                }}
                aria-label="Add roster to calendar"
                title="Add to calendar"
              >
                <CalendarPlus size={12} aria-hidden />
              </Button>
            }
          >
            <DutyRoster roster={roster} onLog={openLog} onCheckin={() => navigate("/check-in")} />
          </Panel>

          <Panel title="Recent">
            {plan.recent_sessions.length === 0 ? (
              <p className="rounded-xl bg-surface-muted px-3 py-2.5 text-[11px] text-muted">
                No sessions yet.
              </p>
            ) : (
              <Disclosure
                summary="Last five sessions"
                meta={`${plan.recent_sessions.length}`}
                summaryClassName="text-[11px] font-medium text-accent"
              >
                <ul className="divide-y divide-line">
                  {plan.recent_sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-ink">
                          {session.item_name}
                        </p>
                        <p className="text-[9px] text-muted">
                          {session.duration_min} min · {formatRelativeTime(session.completed_at)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] text-muted">{session.domain}</span>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
