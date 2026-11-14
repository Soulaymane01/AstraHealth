import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Alert } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

function severityRank(severity: string): number {
  if (severity === "critical") return 3;
  if (severity === "caution") return 2;
  if (severity === "watch") return 1;
  return 0;
}

export async function fetchAlerts(): Promise<Alert[]> {
  const { data, response } = await api.GET("/alerts", {
    params: { query: { status: "active" } },
  });
  if (!response.ok || !data) {
    // Never turn an API failure into "no active alerts"; that reads as an
    // all-clear when the crew may actually have a critical finding.
    throw new Error("Unable to load alerts. Check the connection and try again.");
  }
  return [...data].sort(
    (left, right) =>
      severityRank(right.severity) - severityRank(left.severity) ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
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
