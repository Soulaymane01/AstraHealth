import { useEffect } from "react";

import { useSessionStore } from "@/features/session/session-store";
import { useOfflineStore } from "@/features/offline/store";

export function OfflineProvider() {
  const refresh = useOfflineStore((state) => state.refresh);
  const sync = useOfflineStore((state) => state.sync);
  const setOnline = useOfflineStore((state) => state.setOnline);

  useEffect(() => {
    let active = true;

    const settle = async () => {
      await refresh();
      if (!active) return;
      const state = useOfflineStore.getState();
      if (state.online && state.pending > 0) {
        await sync();
      }
    };

    void settle();

    const onOnline = () => {
      setOnline(true);
      void settle();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void settle();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    const unsubscribeAuth = useSessionStore.subscribe((state, previous) => {
      if (state.user?.id !== previous.user?.id) void settle();
    });

    const interval = window.setInterval(() => {
      if (!active) return;
      const state = useOfflineStore.getState();
      if (!navigator.onLine) {
        setOnline(false);
        return;
      }
      if (state.syncing) return;
      if (state.pending > 0) {
        void settle();
      } else {
        void refresh();
      }
    }, 60_000);

    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribeAuth();
      window.clearInterval(interval);
    };
  }, [refresh, setOnline, sync]);

  return null;
}
