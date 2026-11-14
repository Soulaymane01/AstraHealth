import { Download, LogOut, Orbit, Palette } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "sonner";

import { useAuthStore } from "@/features/auth/auth-store";
import { usePwaInstall } from "@/features/pwa/usePwaInstall";
import { DEMO_MODE } from "@/lib/demo";
import { NAV_ITEMS } from "@/features/shell/nav";
import { useTrainingReminders } from "@/features/training/queries";
import { cn, initials, titleCase } from "@/lib/utils";

export function NavContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const reminders = useTrainingReminders();
  const { canInstall, install } = usePwaInstall();
  const dueCount = reminders.data?.due_count ?? 0;

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center py-5",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Orbit size={17} aria-hidden />
        </span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
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
          </>
        )}
      </div>

      <nav
        className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-2")}
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                  isActive
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-2 hover:bg-surface-muted hover:text-ink",
                )
              }
            >
              <Icon size={collapsed ? 18 : 16} aria-hidden />
              {!collapsed && item.label}
              {item.to === "/training" && dueCount > 0 && !collapsed && (
                <span
                  className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-watch-soft px-1 text-[9px] font-medium tabular text-watch"
                  title={`${dueCount} training item${dueCount === 1 ? "" : "s"} due`}
                >
                  {dueCount}
                </span>
              )}
              {item.to === "/training" && dueCount > 0 && collapsed && (
                <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-watch" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={cn("border-t border-line", collapsed ? "p-2" : "p-3")}>
        <div
          className={cn(
            "flex items-center rounded-lg",
            collapsed ? "flex-col gap-1.5 py-1" : "gap-2.5 px-2 py-2",
          )}
          title={`${user.full_name} · ${titleCase(user.role)}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {initials(user.full_name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{user.full_name}</p>
              <p className="truncate text-[11px] text-muted">{titleCase(user.role)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success("Signed out.");
            }}
            aria-label="Sign out"
            title="Sign out"
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
            aria-label="Install app"
            title="Install app"
            className={cn(
              "mt-1 flex items-center gap-2 rounded-lg text-xs text-muted transition-colors hover:bg-surface-muted hover:text-ink",
              collapsed ? "justify-center px-0 py-2" : "w-full px-3 py-2",
            )}
          >
            <Download size={14} aria-hidden />
            {!collapsed && "Install app"}
          </button>
        )}

        {!DEMO_MODE && (
          <NavLink
            to="/styleguide"
            onClick={onNavigate}
            aria-label="Design system"
            title="Design system"
            className={cn(
              "mt-1 flex items-center gap-2 rounded-lg text-xs text-muted transition-colors hover:bg-surface-muted hover:text-ink",
              collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
            )}
          >
            <Palette size={14} aria-hidden />
            {!collapsed && "Design system"}
          </NavLink>
        )}
      </div>
    </div>
  );
}
