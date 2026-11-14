import { useState } from "react";
import { Outlet } from "react-router-dom";

import { FlightSurgeonDrawer } from "@/features/assistant/FlightSurgeonDrawer";
import { OfflineBanner } from "@/features/offline/OfflineBanner";
import { MobileNav } from "@/features/shell/MobileNav";
import { Sidebar } from "@/features/shell/Sidebar";
import { TopBar } from "@/features/shell/TopBar";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <Sidebar />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-60">
        <TopBar onOpenNav={() => setMobileOpen(true)} />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <FlightSurgeonDrawer />
    </div>
  );
}
