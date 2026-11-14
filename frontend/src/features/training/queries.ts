import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  TrainingItem,
  TrainingLogResult,
  TrainingPlan,
  TrainingReminder,
  TrainingRoster,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useTrainingPlan() {
  return useQuery({
    queryKey: queryKeys.trainingPlan,
    queryFn: async (): Promise<TrainingPlan> => {
      const { data } = await api.GET("/training/plan");
      if (!data) throw new Error("Unable to load the training plan.");
      return data;
    },
  });
}

export function useTrainingRoster(date?: string) {
  return useQuery({
    queryKey: queryKeys.trainingRoster(date ?? "today"),
    queryFn: async (): Promise<TrainingRoster> => {
      const { data } = await api.GET("/training/roster", {
        params: { query: date ? { date } : {} },
      });
      if (!data) throw new Error("Unable to load the duty roster.");
      return data;
    },
  });
}

export function useTrainingReminders() {
  return useQuery({
    queryKey: queryKeys.trainingReminders,
    queryFn: async (): Promise<TrainingReminder> => {
      const { data } = await api.GET("/training/reminders");
      if (!data) throw new Error("Unable to load training reminders.");
      return data;
    },
  });
}

export function useTrainingCatalog(profile?: string) {
  return useQuery({
    queryKey: queryKeys.trainingCatalog,
    queryFn: async (): Promise<TrainingItem[]> => {
      const { data } = await api.GET("/training/catalog", {
        params: { query: profile ? { profile } : {} },
      });
      return data ?? [];
    },
  });
}

export function useLogTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      item_code: string;
      duration_min: number;
      rpe?: number;
    }): Promise<TrainingLogResult> => {
      const { data, response } = await api.POST("/training/sessions", {
        body: payload,
      });
      if (response.status === 404) {
        throw new Error("That training item could not be found.");
      }
      if (!data) throw new Error("Unable to log the training session.");
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trainingPlan }),
        queryClient.invalidateQueries({ queryKey: ["training", "roster"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.trainingReminders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gamification }),
        queryClient.invalidateQueries({ queryKey: queryKeys.credits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.achievements }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missionLog }),
      ]);
    },
  });
}
