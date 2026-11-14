import { Clock, Menu, Radio, Stethoscope, Users } from "lucide-react";
import { useLocation } from "react-router-dom";

import { MetClock } from "@/components/ui/MetClock";
import { useAssistantStore } from "@/features/assistant/store";
import { useOfflineStore } from "@/features/offline/store";
import { useMission } from "@/features/mission/queries";
import { useTrainingReminders } from "@/features/training/queries";
import { NAV_ITEMS } from "@/features/shell/nav";
import { useReadiness } from "@/features/readiness/queries";
import { DEMO_MODE } from "@/lib/demo";
import { asStatus, STATUS_META } from "@/lib/status";
import { cn, formatCommsDelay } from "@/lib/utils";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { pathname } = useLocation();
  const { data: mission, isLoading: missionLoading } = useMission();
  const { data: readiness } = useReadiness();
  const { data: reminders } = useTrainingReminders();
  const nextDue = reminders?.next_due ?? null;
  const openAssistant = useAssistantStore((state) => state.openAssistant);
  const online = useOfflineStore((state) => state.online);

  const title = pathname.startsWith("/check-in/report")
    ? "Systems Report"
    : (NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
        ?.label ?? "AstraHealth");

  const subtitle = mission
    ? `${mission.crew_name} · ${mission.name}${DEMO_MODE ? " · Simulated" : ""}`
    : missionLoading
      ? "Loading mission…"
      : online
        ? "No mission assigned"
        : "Offline — mission context unavailable";

  const readinessStatus = readiness ? asStatus(readiness.status) : null;
  const readinessMeta = readinessStatus ? STATUS_META[readinessStatus] : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
      >
        <Menu size={17} aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</p>
        <p className="truncate text-[11px] text-muted">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openAssistant}
          aria-label="Ask the Flight Surgeon"
          title="Ask the Flight Surgeon"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
        >
          <Stethoscope size={14} aria-hidden />
        </button>

        {readiness && readinessMeta && readinessStatus && (
          <span
            className="hidden items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 sm:inline-flex"
            title={`${readinessMeta.label}: ${readinessMeta.description}`}
          >
            <span className="text-[11px] text-muted">Readiness</span>
            <span className="text-sm font-semibold tabular text-ink">
              {Math.round(readiness.score)}
            </span>
            <span className={cn("text-[11px] font-medium", readinessMeta.text)}>
              {readinessMeta.label}
            </span>
          </span>
        )}

        {nextDue && (
          <span
            className="hidden items-center gap-1.5 text-xs text-muted xl:inline-flex"
            title={`Next: ${nextDue.title} at ${nextDue.time}`}
          >
            <Clock size={12} aria-hidden />
            <span className="text-[10px]">Next</span>
            <span className="tabular">{nextDue.time}</span>
            <span className="max-w-28 truncate">{nextDue.title}</span>
          </span>
        )}

        {mission && <MetClock startAt={mission.start_at} className="hidden sm:inline-flex" />}

        {mission && (
          <span className="hidden items-center gap-1.5 text-xs text-muted md:inline-flex">
            <Users size={13} aria-hidden />
            {mission.crew_count}
          </span>
        )}

        {mission && (
          <span className="hidden items-center gap-1.5 text-xs text-muted xl:inline-flex">
            <Radio size={13} aria-hidden />
            {formatCommsDelay(mission.comms_delay_min)}
          </span>
        )}
      </div>
    </header>
  );
}
