import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/auth-store";
import { readClinical, writeClinical } from "@/features/offline/clinical-cache";
import { api } from "@/lib/api/client";
import type { LogEvent, Mission, MissionContext, TapeEvent } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export type MissionProfile = "mars_transit" | "lunar_surface" | "station";

export async function fetchMission(): Promise<Mission | null> {
  const { data, response } = await api.GET("/mission");
  if (response.status === 404) return null;
  if (!data) throw new Error("Unable to load mission.");
  return data;
}

export function useMission() {
  const userId = useAuthStore((state) => state.user?.id);
  const cached = readClinical<Mission | null>(userId, "mission");
  return useQuery({
    queryKey: queryKeys.mission,
    queryFn: async (): Promise<Mission | null> => {
      const data = await fetchMission();
      writeClinical(userId, "mission", data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}

export function useUpdateMissionProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: MissionProfile): Promise<Mission> => {
      const { data } = await api.PATCH("/mission/profile", { body: { profile } });
      if (!data) throw new Error("Unable to change the mission profile.");
      return data;
    },
    onSuccess: (mission) => {
      queryClient.setQueryData(queryKeys.mission, mission);
      void queryClient.invalidateQueries({ queryKey: queryKeys.mission });
      void queryClient.invalidateQueries({ queryKey: queryKeys.readiness });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      void queryClient.invalidateQueries({ queryKey: queryKeys.captures });
      void queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });
}

export async function fetchMissionContext(): Promise<MissionContext> {
  const { data } = await api.GET("/mission/context");
  if (!data) throw new Error("Unable to load mission context.");
  return data;
}

export function useMissionContext() {
  const userId = useAuthStore((state) => state.user?.id);
  const cached = readClinical<MissionContext>(userId, "mission-context");
  return useQuery({
    queryKey: queryKeys.missionContext,
    queryFn: async (): Promise<MissionContext> => {
      const data = await fetchMissionContext();
      writeClinical(userId, "mission-context", data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}

export async function fetchMissionTape(days: number): Promise<TapeEvent[]> {
  const { data } = await api.GET("/mission/tape", {
    params: { query: { days } },
  });
  if (!data) throw new Error("Unable to load the mission tape.");
  return data;
}

export function useMissionTape(days: number) {
  const userId = useAuthStore((state) => state.user?.id);
  const cached = readClinical<TapeEvent[]>(userId, `mission-tape-${days}`);
  return useQuery({
    queryKey: queryKeys.missionTape(days),
    queryFn: async (): Promise<TapeEvent[]> => {
      const data = await fetchMissionTape(days);
      writeClinical(userId, `mission-tape-${days}`, data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}

export function useMissionLog(limit = 50) {
  const userId = useAuthStore((state) => state.user?.id);
  const cached = readClinical<LogEvent[]>(userId, `mission-log-${limit}`);
  return useQuery({
    queryKey: queryKeys.missionLog,
    queryFn: async (): Promise<LogEvent[]> => {
      const { data } = await api.GET("/mission/log", { params: { query: { limit } } });
      if (!data) throw new Error("Unable to load the mission log.");
      writeClinical(userId, `mission-log-${limit}`, data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}
