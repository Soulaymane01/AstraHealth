import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Alert } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await api.GET("/alerts", {
    params: { query: { status: "active" } },
  });
  return data ?? [];
}

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: fetchAlerts,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: number) => {
      const { data } = await api.POST("/alerts/{alert_id}/ack", {
        params: { path: { alert_id: alertId } },
      });
      if (!data) throw new Error("Unable to acknowledge the alert.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}
