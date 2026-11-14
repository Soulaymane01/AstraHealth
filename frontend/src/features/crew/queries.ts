import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/auth-store";
import { api } from "@/lib/api/client";
import type { CrewLeaderboardEntry, CrewMember } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export type ShareStatus = "private" | "status_only" | "full";

export function useCrew() {
  return useQuery({
    queryKey: queryKeys.crew,
    queryFn: async (): Promise<CrewMember[]> => {
      const { data } = await api.GET("/crew");
      return data ?? [];
    },
  });
}

export function useCrewLeaderboard() {
  return useQuery({
    queryKey: queryKeys.crewLeaderboard,
    queryFn: async (): Promise<CrewLeaderboardEntry[]> => {
      const { data } = await api.GET("/crew/leaderboard");
      return data ?? [];
    },
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareStatus: ShareStatus) => {
      const { data } = await api.PATCH("/me/privacy", {
        body: { share_status: shareStatus },
      });
      if (!data) throw new Error("Unable to update your sharing preference.");
      return data;
    },
    onSuccess: async (data) => {
      useAuthStore.getState().updateUser({ share_status: data.share_status });
      await queryClient.invalidateQueries({ queryKey: queryKeys.crew });
    },
  });
}
