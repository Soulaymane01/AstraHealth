import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/auth-store";
import type { CheckinPayload } from "@/features/checkin/checkin-form";
import { enqueueCheckin } from "@/features/offline/queue";
import { useOfflineStore } from "@/features/offline/store";
import { api, isNetworkError } from "@/lib/api/client";
import type { Checkin, CheckinReport } from "@/lib/api/types";
import type { QueuedCheckin } from "@/lib/local-db";
import { queryKeys } from "@/lib/query-keys";

export type CreateCheckinResult =
  { kind: "created"; checkin: Checkin } | { kind: "queued"; item: QueuedCheckin };

async function queueCheckin(userId: number, payload: CheckinPayload): Promise<CreateCheckinResult> {
  const item = await enqueueCheckin(userId, payload);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useOfflineStore.getState().setOnline(false);
  }
  await useOfflineStore.getState().refresh();
  return { kind: "queued", item };
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    mutationFn: async (payload: CheckinPayload): Promise<CreateCheckinResult> => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error("Sign in again to save the check-in.");

      const offline =
        !useOfflineStore.getState().online ||
        (typeof navigator !== "undefined" && !navigator.onLine);
      if (offline) return queueCheckin(userId, payload);

      let response: Response;
      try {
        const result = await api.POST("/checkins", { body: payload });
        if (result.data) return { kind: "created", checkin: result.data };
        response = result.response;
      } catch (error) {
        if (isNetworkError(error)) return queueCheckin(userId, payload);
        throw error;
      }

      const status = response.status;
      if (status === 429 || status >= 500) {
        return queueCheckin(userId, payload);
      }
      if (status === 401) {
        throw new Error("Your session expired. Sign in again to submit the check-in.");
      }
      if (status === 422) {
        throw new Error("Check the readings and try again.");
      }
      if (status === 404) {
        throw new Error("One of the readings is no longer available. Refresh and try again.");
      }
      throw new Error("Unable to save the check-in right now.");
    },
    onSuccess: async (result) => {
      if (result.kind !== "created") return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["readiness"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
        queryClient.invalidateQueries({ queryKey: ["mission"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["domains"] }),
        queryClient.invalidateQueries({ queryKey: ["gamification"] }),
        queryClient.invalidateQueries({ queryKey: ["credits"] }),
        queryClient.invalidateQueries({ queryKey: ["achievements"] }),
        queryClient.invalidateQueries({ queryKey: ["mission", "log"] }),
        queryClient.invalidateQueries({ queryKey: ["training"] }),
      ]);
    },
  });
}

export function useCheckinReport(checkinId: number | null) {
  return useQuery({
    queryKey: queryKeys.checkinReport(checkinId ?? 0),
    queryFn: async (): Promise<CheckinReport> => {
      if (checkinId === null) throw new Error("No check-in selected.");
      const { data, response } = await api.GET("/checkins/{checkin_id}/report", {
        params: { path: { checkin_id: checkinId } },
      });
      if (response.status === 404) throw new Error("That Systems Report could not be found.");
      if (!data) throw new Error("Unable to load the Systems Report.");
      return data;
    },
    enabled: checkinId !== null,
  });
}
