import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Achievement, CreditLedger, GamificationSummary } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useGamificationSummary() {
  return useQuery({
    queryKey: queryKeys.gamification,
    queryFn: async (): Promise<GamificationSummary> => {
      const { data } = await api.GET("/gamification/summary");
      if (!data) throw new Error("Unable to load mission standing.");
      return data;
    },
  });
}

export function useCredits(limit = 20) {
  return useQuery({
    queryKey: queryKeys.credits,
    queryFn: async (): Promise<CreditLedger> => {
      const { data } = await api.GET("/credits", { params: { query: { limit } } });
      if (!data) throw new Error("Unable to load the credit ledger.");
      return data;
    },
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: async (): Promise<Achievement[]> => {
      const { data } = await api.GET("/achievements");
      return data ?? [];
    },
  });
}
