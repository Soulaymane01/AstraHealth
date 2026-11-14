import {
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Gift,
  ScrollText,
  Trophy,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { CreditChip, RankBadge } from "@/components/ui/RankBadge";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { AchievementTile } from "@/features/gamification/components/AchievementTile";
import { StreakTile } from "@/features/gamification/components/StreakTile";
import { rewardIcon } from "@/features/gamification/icons";
import {
  useAchievements,
  useCredits,
  useGamificationSummary,
  useRedeemReward,
  useRewards,
} from "@/features/gamification/queries";
import { useMissionLog } from "@/features/mission/queries";
import { RewardCard } from "@/components/ui/RewardCard";
import type { LogEvent } from "@/lib/api/types";
import { asStatus, STATUS_META } from "@/lib/status";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";

const EVENT_META: Record<LogEvent["type"], { icon: LucideIcon; className: string; label: string }> =
  {
    checkin: { icon: ClipboardCheck, className: "bg-accent-soft text-accent", label: "Check-in" },
    alert: { icon: TriangleAlert, className: "bg-watch-soft text-watch", label: "Alert" },
    training: { icon: Dumbbell, className: "bg-nominal-soft text-nominal", label: "Training" },
    achievement: { icon: Trophy, className: "bg-watch-soft text-watch", label: "Achievement" },
    redemption: { icon: Gift, className: "bg-accent-soft text-accent", label: "Allowance" },
  };

function eventMeta(event: LogEvent) {
  if (event.type === "alert" && event.status) {
    const status = asStatus(event.status);
    return {
      icon: EVENT_META.alert.icon,
      className: cn(STATUS_META[status].bg, STATUS_META[status].text),
      label: EVENT_META.alert.label,
    };
  }
  return EVENT_META[event.type];
}

function ActivityRow({ event }: { event: LogEvent }) {
  const [open, setOpen] = useState(false);
  const meta = eventMeta(event);
  const Icon = meta.icon;
  const status = event.type === "alert" && event.status ? asStatus(event.status) : null;

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2.5 py-2 text-left transition-colors hover:bg-surface-muted/40"
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            meta.className,
          )}
        >
          <Icon size={12} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[12px] font-medium text-ink">{event.title}</span>
            {status && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide",
                  STATUS_META[status].text,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)} />
                {STATUS_META[status].label}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-[10px] text-muted">
          {formatRelativeTime(event.at)}
        </span>
        <ChevronDown
          size={13}
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <p className="pb-2.5 pl-[34px] pr-6 text-[11px] leading-relaxed text-ink-2">
          {event.detail}
        </p>
      )}
    </li>
  );
}

export function MissionLogPage() {
  const summaryQuery = useGamificationSummary();
  const creditsQuery = useCredits(8);
  const achievementsQuery = useAchievements();
  const rewardsQuery = useRewards();
  const logQuery = useMissionLog(40);
  const redeem = useRedeemReward();
  const [showAllEvents, setShowAllEvents] = useState(false);

  if (summaryQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <QueryError
        title="Mission log unavailable"
        message="The mission log could not be loaded."
        onRetry={() => void summaryQuery.refetch()}
        retrying={summaryQuery.isFetching}
      />
    );
  }

  const summary = summaryQuery.data;
  const ledger = creditsQuery.data;
  const achievements = achievementsQuery.data ?? [];
  const rewards = rewardsQuery.data ?? [];
  const events = logQuery.data ?? [];
  const unlocked = achievements.filter((item) => item.unlocked).length;

  const onRedeem = (code: string, name: string) => {
    redeem.mutate(code, {
      onSuccess: (result) => {
        toast.success(`${name} redeemed. ${formatNumber(result.balance)} FC remaining.`);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Unable to redeem this allowance.");
      },
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Mission Log</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Your mission so far.
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            Check-ins, alerts, training, achievements, and mission allowances in one place. Rank and
            credits reward consistency, never a health reading.
          </p>
        </div>
        <CreditChip amount={summary.balance} showLabel className="self-start sm:self-auto" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <RankBadge
            rank={summary.rank.rank}
            credits={summary.balance}
            nextRank={summary.rank.next_rank ?? undefined}
            progress={summary.rank.progress}
          />
        </div>

        <Panel className="lg:col-span-4" title="Streaks" subtitle="One grace day per streak.">
          <div className="grid gap-2">
            {summary.checkin_streak ? (
              <StreakTile label="Systems Check" streak={summary.checkin_streak} />
            ) : (
              <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-[11px] text-muted">
                Start a Systems Check to begin a streak.
              </p>
            )}
            {summary.training_streak ? (
              <StreakTile label="Training" streak={summary.training_streak} />
            ) : (
              <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-[11px] text-muted">
                Log a training session to begin a training streak.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          className="lg:col-span-4"
          title="Credit ledger"
          subtitle="Lifetime rank and spendable balance."
          actions={<CreditChip amount={summary.balance} />}
        >
          {creditsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : ledger ? (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Lifetime credited</span>
                <span className="tabular text-ink">
                  {formatNumber(ledger.lifetime_credited)} FC
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted">Spent on allowances</span>
                <span className="tabular text-ink">{formatNumber(ledger.total_spent)} FC</span>
              </div>
              <ul className="mt-2 divide-y divide-line">
                {ledger.entries.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-2 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-ink-2">{entry.reason}</p>
                      <p className="text-[10px] text-muted">
                        {formatRelativeTime(entry.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular",
                        entry.amount >= 0 ? "text-nominal" : "text-caution",
                      )}
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {formatNumber(entry.amount)} FC
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[11px] text-muted">No ledger entries yet.</p>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="Activity"
          subtitle="The last 40 events in your mission."
        >
          {logQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg bg-surface-muted px-4 py-8 text-center">
              <ScrollText size={18} className="mx-auto text-muted" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink">Nothing logged yet.</p>
              <p className="mt-1 text-xs text-muted">
                Complete a check-in or log a training session to start the record.
              </p>
              <Link
                to="/check-in"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent"
              >
                Start a check-in
                <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          ) : (
            <>
              <ol className="divide-y divide-line">
                {(showAllEvents ? events : events.slice(0, 18)).map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </ol>
              {events.length > 18 && (
                <button
                  type="button"
                  onClick={() => setShowAllEvents((current) => !current)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-strong"
                >
                  {showAllEvents ? "Show fewer events" : `Show all ${events.length} events`}
                  <ChevronDown
                    size={12}
                    className={cn("transition-transform", showAllEvents && "rotate-180")}
                    aria-hidden
                  />
                </button>
              )}
            </>
          )}
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="Mission allowances"
          subtitle="Chosen before departure. Redeem with Flight Credits."
        >
          {rewardsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-[11px] text-muted">No allowances are available yet.</p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const Icon = rewardIcon(reward.icon);
                return (
                  <RewardCard
                    key={reward.code}
                    name={reward.name}
                    description={reward.description}
                    cost={reward.cost}
                    icon={Icon}
                    state={reward.state}
                    shortfall={reward.shortfall}
                    onRedeem={
                      reward.state === "available"
                        ? () => onRedeem(reward.code, reward.name)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            Allowances are one-time. Redemption is recorded in the ledger and the activity feed.
          </p>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="Achievements"
        subtitle={
          achievementsQuery.isLoading
            ? "Loading commendations…"
            : `${unlocked} of ${achievements.length} unlocked`
        }
      >
        {achievementsQuery.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <AchievementTile key={achievement.code} achievement={achievement} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
