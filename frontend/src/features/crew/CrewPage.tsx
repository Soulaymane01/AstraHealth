import { Check, Lock, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { QueryError } from "@/components/ui/QueryError";
import { QuizCard } from "@/components/ui/QuizCard";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Status";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useCrew,
  useCrewLeaderboard,
  useUpdatePrivacy,
  type ShareStatus,
} from "@/features/crew/queries";
import { asStatus } from "@/lib/status";
import { cn, initials, titleCase } from "@/lib/utils";

const PRIVACY_OPTIONS: { value: ShareStatus; label: string; description: string }[] = [
  { value: "private", label: "Private", description: "Readiness hidden from crewmates." },
  {
    value: "status_only",
    label: "Status only",
    description: "Share the status label, not the score.",
  },
  { value: "full", label: "Full", description: "Share your status and readiness score." },
];

export function CrewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const crewQuery = useCrew();
  const leaderboardQuery = useCrewLeaderboard();
  const updatePrivacy = useUpdatePrivacy();

  if (crewQuery.isLoading || leaderboardQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (crewQuery.isError || leaderboardQuery.isError) {
    return (
      <QueryError
        title="Crew data unavailable"
        message="The crew board could not be loaded."
        onRetry={() => {
          void crewQuery.refetch();
          void leaderboardQuery.refetch();
        }}
        retrying={crewQuery.isFetching || leaderboardQuery.isFetching}
      />
    );
  }

  const roster = crewQuery.data ?? [];
  const leaderboard = leaderboardQuery.data ?? [];
  const shareStatus = (user?.share_status ?? "private") as ShareStatus;
  const privacy = PRIVACY_OPTIONS.find((option) => option.value === shareStatus);

  const changePrivacy = (next: ShareStatus) => {
    updatePrivacy.mutate(next, {
      onSuccess: () => toast.success("Sharing preference updated."),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Unable to update sharing."),
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Crew</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">
            Crew readiness, on your terms.
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            The crew can talk directly. This page only shares the readiness each person chooses and
            keeps a consistency board for motivation. There is no in-app chat or nudge inbox.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
          <Users size={12} className="text-accent" aria-hidden />
          {roster.length} crew member{roster.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ShieldCheck size={15} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">Sharing</p>
              <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                {privacy?.label ?? "Private"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {privacy?.description ?? "Choose what crewmates can see."} You control this.
            </p>
          </div>
        </div>

        <Disclosure
          className="mt-2 border-t border-line pt-2"
          summary="Change sharing"
          meta={privacy?.label}
          summaryClassName="text-[10px] font-medium text-accent"
        >
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Readiness sharing preference"
          >
            {PRIVACY_OPTIONS.map((option) => {
              const active = shareStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  disabled={updatePrivacy.isPending}
                  onClick={() => changePrivacy(option.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                    active
                      ? "border-accent/30 bg-accent-soft"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    {active && <Check size={11} className="text-accent" aria-hidden />}
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            Status only shares the label — Watch, Caution, Critical — but never the score. Private
            hides both from crewmates. You always see your own data.
          </p>
        </Disclosure>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel
          className="self-start lg:col-span-7"
          title="Crew board"
          subtitle="Ranked by consistency and training adherence."
        >
          {leaderboard.length === 0 ? (
            <div className="rounded-lg bg-surface-muted px-4 py-8 text-center">
              <Users size={18} className="mx-auto text-muted" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink">No crew assigned yet.</p>
              <p className="mt-1 text-xs text-muted">
                A crew admin can link you to a mission after registration.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {leaderboard.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-3">
                  <span className="w-5 shrink-0 pt-1 text-center text-[10px] font-medium tabular text-muted">
                    {entry.position}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                    {initials(entry.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-ink">{entry.full_name}</p>
                      {entry.is_self && (
                        <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] text-muted">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted">
                      {titleCase(entry.role)} · {entry.checkin_days} check-ins ·{" "}
                      {entry.training_days} training days
                    </p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${entry.consistency_score}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 pt-1 text-right">
                    <p className="text-lg font-semibold tabular text-ink">
                      {entry.consistency_score}
                    </p>
                    <p className="text-[9px] text-muted">consistency</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            Consistency is 70% check-in coverage and 30% training coverage over 14 days. Health
            readings never appear on this board. No message is sent from this page.
          </p>
        </Panel>

        <div className="space-y-4 lg:col-span-5">
          <Panel title="Crew readiness" subtitle="Only what each person chooses to share.">
            <div className="space-y-2">
              {roster.map((member) => {
                const status = member.readiness_status ? asStatus(member.readiness_status) : null;
                return (
                  <div
                    key={member.id}
                    className="rounded-lg border border-line bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink-2">
                        {initials(member.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-medium text-ink">
                            {member.full_name}
                          </p>
                          {member.is_self && (
                            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] text-muted">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted">{titleCase(member.role)}</p>
                      </div>
                      {status ? (
                        <StatusBadge status={status} />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                          <Lock size={10} aria-hidden />
                          Private
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted">
                      <span>
                        {member.readiness_score !== null
                          ? `Readiness ${member.readiness_score.toFixed(1)}`
                          : member.share_status === "status_only"
                            ? "Score not shared"
                            : member.share_status === "private"
                              ? "Readiness private"
                              : "No snapshot yet"}
                      </span>
                      <span>
                        {member.checkin_days} check-ins · {member.training_days} training days
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <QuizCard
            title="How has your crewmate seemed this week?"
            mode="crew"
            questions={5}
            onStart={() => navigate("/quizzes/know-your-crew")}
          />
        </div>
      </div>
    </div>
  );
}
