import { toast } from "sonner";
import { create } from "zustand";

import { queryClient } from "@/app/query-client";
import { useAuthStore } from "@/features/auth/auth-store";
import { discardFailedCheckins, listQueuedCheckins } from "@/features/offline/queue";
import { syncQueuedCheckins } from "@/features/offline/sync";

interface OfflineState {
  online: boolean;
  pending: number;
  failed: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
  setOnline: (online: boolean) => void;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  discardFailed: () => Promise<void>;
}

const INVALIDATE_KEYS = [
  ["readiness"],
  ["alerts"],
  ["mission"],
  ["metrics"],
  ["domains"],
  ["gamification"],
  ["credits"],
  ["achievements"],
  ["checkin"],
  ["training"],
];

export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pending: 0,
  failed: 0,
  syncing: false,
  lastSyncedAt: null,
  lastError: null,

  setOnline: (online) => set({ online }),

  refresh: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ pending: 0, failed: 0 });
      return;
    }
    try {
      const items = await listQueuedCheckins(userId);
      set({
        pending: items.filter((item) => item.status === "pending").length,
        failed: items.filter((item) => item.status === "failed").length,
      });
    } catch {
      set({ lastError: "Local check-in storage is unavailable on this device." });
    }
  },

  sync: async () => {
    if (get().syncing) return;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ online: false });
      await get().refresh();
      return;
    }

    set({ syncing: true, lastError: null });
    try {
      const result = await syncQueuedCheckins(userId);
      if (result.synced > 0) {
        const label = result.synced === 1 ? "check-in" : "check-ins";
        toast.success(`${result.synced} ${label} synced from this device.`);
        set({ lastSyncedAt: Date.now() });
        await Promise.all(
          INVALIDATE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }
      if (result.failed > 0) {
        toast.error(
          result.failed === 1
            ? "One queued check-in could not sync. Review it in the offline banner."
            : `${result.failed} queued check-ins could not sync.`,
        );
      }
      if (result.stoppedByAuth) {
        set({ lastError: "Sign in again to sync queued check-ins." });
      } else if (result.stoppedByNetwork) {
        set({ lastError: "Waiting for a connection." });
      } else if (result.remaining > 0) {
        set({ lastError: "The server is unavailable. It will retry at the next sync." });
      }
    } catch (error) {
      set({
        lastError: error instanceof Error ? error.message : "Queued check-ins could not sync.",
      });
    } finally {
      set({ syncing: false });
      await get().refresh();
    }
  },

  discardFailed: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const count = await discardFailedCheckins(userId);
    if (count > 0) {
      toast.success(
        count === 1
          ? "The failed check-in was discarded."
          : `${count} failed check-ins were discarded.`,
      );
    }
    await get().refresh();
  },
}));
