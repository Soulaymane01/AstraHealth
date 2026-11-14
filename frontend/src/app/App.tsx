import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";

import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { queryClient } from "@/app/query-client";
import { router } from "@/app/router";
import { isSessionRevalidating, useAuthStore } from "@/features/auth/auth-store";
import { OfflineProvider } from "@/features/offline/OfflineProvider";

export function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handler = () => {
      const state = useAuthStore.getState();
      if (state.status === "authenticated" && !isSessionRevalidating()) {
        state.logout();
        toast.error("Your session expired. Sign in again.");
      }
    };

    window.addEventListener("astra:unauthorized", handler);
    return () => window.removeEventListener("astra:unauthorized", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <OfflineProvider />
        <RouterProvider router={router} />
        <Toaster position="top-right" theme="light" closeButton />
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}
