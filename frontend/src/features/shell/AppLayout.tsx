import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Navigate, Outlet, ScrollRestoration, useLocation } from "react-router-dom";

import { useSessionStore } from "@/features/session/session-store";

import { FlightSurgeonDrawer } from "@/features/assistant/FlightSurgeonDrawer";
import { OfflineBanner } from "@/features/offline/OfflineBanner";
import { MobileNav } from "@/features/shell/MobileNav";
import { Sidebar } from "@/features/shell/Sidebar";
import { useShellStore } from "@/features/shell/shell-store";
import { TopBar } from "@/features/shell/TopBar";

function titleForPath(pathname: string): string {
  if (pathname === "/") return "Flight Deck";
  if (pathname === "/triage") return "Triage protocol";
  if (pathname === "/check-in") return "Systems Check";
  if (pathname.startsWith("/check-in/report/")) return "Systems Report";
  if (pathname === "/telemetry") return "Telemetry";
  if (pathname.startsWith("/telemetry/metric/")) return "Metric detail";
  if (pathname.startsWith("/telemetry/domain/")) return "Domain summary";
  if (pathname === "/training") return "Training";
  if (pathname === "/quizzes") return "Quizzes";
  if (pathname.startsWith("/quizzes/")) return "Quiz";
  if (pathname === "/log") return "Mission Log";
  if (pathname === "/library") return "Library";
  if (pathname.startsWith("/library/")) return "Article";
  if (pathname === "/styleguide") return "Design system";
  return "AstraHealth";
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const sidebarCollapsed = useShellStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} · AstraHealth`;
  }, [location.pathname]);

  if (user?.role === "flight_surgeon") {
    return <Navigate to="/surgeon" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <ScrollRestoration />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div
        className={cn(
          "transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-60",
        )}
      >
        <TopBar onOpenNav={() => setMobileOpen(true)} />
        <OfflineBanner />
        <main
          id="main"
          className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>

      <FlightSurgeonDrawer />
    </div>
  );
}
