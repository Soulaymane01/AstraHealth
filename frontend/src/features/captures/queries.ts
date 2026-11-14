import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api/client";
import type { CaptureFeed } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useCaptureFeed() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.captureFeed,
    queryFn: async (): Promise<CaptureFeed> => {
      const { data } = await api.GET("/captures");
      if (!data) throw new Error("Unable to load the sensor capture feed.");
      return data;
    },
    // The backend creates a simulated capture when the interval has elapsed.
    // Polling makes the dashboard update without astronaut input.
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!query.data?.captured) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.readiness });
    void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    void queryClient.invalidateQueries({ queryKey: ["domains"] });
  }, [query.data?.captured, queryClient]);

  return query;
}

export function useSimulateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CaptureFeed> => {
      const { data } = await api.POST("/captures/simulate");
      if (!data) throw new Error("Unable to simulate a sensor capture.");
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.captureFeed, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.readiness });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });
}
