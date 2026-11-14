import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { LogEvent, Mission, MissionContext, TapeEvent } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export async function fetchMission(): Promise<Mission | null> {
  const { data, response } = await api.GET("/mission");
  if (response.status === 404) return null;
  if (!data) throw new Error("Unable to load mission.");
  return data;
}

export function useMission() {
  return useQuery({
    queryKey: queryKeys.mission,
    queryFn: fetchMission,
  });
}

export async function fetchMissionContext(): Promise<MissionContext | null> {
  const { data } = await api.GET("/mission/context");
  return data ?? null;
}

export function useMissionContext() {
  return useQuery({
    queryKey: queryKeys.missionContext,
    queryFn: fetchMissionContext,
  });
}

export async function fetchMissionTape(days: number): Promise<TapeEvent[]> {
  const { data } = await api.GET("/mission/tape", {
    params: { query: { days } },
  });
  return data ?? [];
}

export function useMissionTape(days: number) {
  return useQuery({
    queryKey: queryKeys.missionTape(days),
    queryFn: () => fetchMissionTape(days),
  });
}

export function useMissionLog(limit = 50) {
  return useQuery({
    queryKey: queryKeys.missionLog,
    queryFn: async (): Promise<LogEvent[]> => {
      const { data } = await api.GET("/mission/log", { params: { query: { limit } } });
      return data ?? [];
    },
  });
}
