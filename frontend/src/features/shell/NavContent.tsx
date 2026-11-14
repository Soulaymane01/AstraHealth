import { Download, LogOut, Orbit, Palette } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "sonner";

import { useAuthStore } from "@/features/auth/auth-store";
import { usePwaInstall } from "@/features/pwa/usePwaInstall";
import { DEMO_MODE } from "@/lib/demo";
import { NAV_ITEMS } from "@/features/shell/nav";
import { useTrainingReminders } from "@/features/training/queries";
import { cn, initials, titleCase } from "@/lib/utils";

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const reminders = useTrainingReminders();
  const { canInstall, install } = usePwaInstall();
  const dueCount = reminders.data?.due_count ?? 0;

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Orbit size={17} aria-hidden />
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold tracking-[-0.01em] text-ink">AstraHealth</p>
            {DEMO_MODE && (
              <span
                title="Seeded demonstration mission and crew data"
                className="rounded-full bg-watch-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-watch"
              >
                Demo
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted">Crew health</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-2 hover:bg-surface-muted hover:text-ink",
                )
              }
            >
              <Icon size={16} aria-hidden />
              {item.label}
              {item.to === "/training" && dueCount > 0 && (
                <span
                  className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-watch-soft px-1 text-[9px] font-medium tabular text-watch"
                  title={`${dueCount} training item${dueCount === 1 ? "" : "s"} due`}
                >
                  {dueCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div
          className="flex items-center gap-2.5 rounded-lg px-2 py-2"
          title={`Sharing: ${user.share_status.replace("_", " ")}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {initials(user.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{user.full_name}</p>
            <p className="truncate text-[11px] text-muted">{titleCase(user.role)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success("Signed out.");
            }}
            aria-label="Sign out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <LogOut size={14} aria-hidden />
          </button>
        </div>

        {canInstall && (
          <button
            type="button"
            onClick={() => {
              void install().then((accepted) => {
                if (accepted) toast.success("AstraHealth installed.");
              });
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <Download size={14} aria-hidden />
            Install app
          </button>
        )}

        {!DEMO_MODE && (
          <NavLink
            to="/styleguide"
            onClick={onNavigate}
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <Palette size={14} aria-hidden />
            Design system
          </NavLink>
        )}
      </div>
    </div>
  );
}
