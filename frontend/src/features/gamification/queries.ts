import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  Achievement,
  CreditLedger,
  GamificationSummary,
  RedemptionResult,
  Reward,
} from "@/lib/api/types";
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

export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards,
    queryFn: async (): Promise<Reward[]> => {
      const { data } = await api.GET("/rewards");
      return data ?? [];
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<RedemptionResult> => {
      const { data, response } = await api.POST("/rewards/{code}/redeem", {
        params: { path: { code } },
      });
      if (response.status === 409) {
        throw new Error("This allowance has already been redeemed.");
      }
      if (response.status === 400) {
        throw new Error("You do not have enough Flight Credits for this allowance.");
      }
      if (!data) throw new Error("Unable to redeem this allowance.");
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rewards }),
        queryClient.invalidateQueries({ queryKey: queryKeys.credits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gamification }),
        queryClient.invalidateQueries({ queryKey: queryKeys.redemptions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missionLog }),
      ]);
    },
  });
}
