import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  Alert,
  MetricSeries,
  SurgeonAssessment,
  SurgeonCrewDetail,
  SurgeonCrewSummary,
  SurgeonInstruction,
  SurgeonUpdates,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useSurgeonCrew() {
  return useQuery({
    queryKey: queryKeys.surgeonCrew,
    queryFn: async (): Promise<SurgeonCrewSummary[]> => {
      const { data } = await api.GET("/surgeon/crew");
      if (!data) throw new Error("Unable to load the crew roster.");
      return data;
    },
  });
}

export function useSurgeonDetail(crewId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.surgeonDetail(crewId ?? 0),
    queryFn: async (): Promise<SurgeonCrewDetail> => {
      if (!crewId) throw new Error("No crew member selected.");
      const { data } = await api.GET("/surgeon/crew/{crew_user_id}", {
        params: { path: { crew_user_id: crewId } },
      });
      if (!data) throw new Error("Unable to load the crew member.");
      return data;
    },
    enabled: Boolean(crewId),
  });
}

export function useSurgeonSeries(crewId: number | undefined, code: string, days: number) {
  return useQuery({
    queryKey: queryKeys.surgeonSeries(crewId ?? 0, code, days),
    queryFn: async (): Promise<MetricSeries> => {
      if (!crewId) throw new Error("No crew member selected.");
      const { data, response } = await api.GET(
        "/surgeon/crew/{crew_user_id}/metrics/{code}/series",
        {
          params: { path: { crew_user_id: crewId, code }, query: { days } },
        },
      );
      if (response.status === 404) throw new Error("That metric could not be found.");
      if (!data) throw new Error("Unable to load the metric series.");
      return data;
    },
    enabled: Boolean(crewId),
    placeholderData: keepPreviousData,
  });
}

function invalidateSurgeon(
  queryClient: ReturnType<typeof useQueryClient>,
  crewId: number,
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.surgeonCrew });
  void queryClient.invalidateQueries({ queryKey: queryKeys.surgeonDetail(crewId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.surgeonUpdates });
}

export function useCreateAssessment(crewId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      working_diagnosis: string;
      findings: string;
      plan: string;
      follow_up?: string | null;
      share_with_crew: boolean;
    }): Promise<SurgeonAssessment> => {
      const { data } = await api.POST("/surgeon/crew/{crew_user_id}/assessments", {
        params: { path: { crew_user_id: crewId } },
        body,
      });
      if (!data) throw new Error("Unable to save the assessment.");
      return data;
    },
    onSuccess: () => invalidateSurgeon(queryClient, crewId),
  });
}

export function useCreateInstruction(crewId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      kind: "note" | "request_checkin" | "request_measurement";
      message: string;
    }): Promise<SurgeonInstruction> => {
      const { data } = await api.POST("/surgeon/crew/{crew_user_id}/instructions", {
        params: { path: { crew_user_id: crewId } },
        body,
      });
      if (!data) throw new Error("Unable to send the instruction.");
      return data;
    },
    onSuccess: () => invalidateSurgeon(queryClient, crewId),
  });
}

export function useAcknowledgeCrewAlert(crewId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: number): Promise<Alert> => {
      const { data } = await api.POST(
        "/surgeon/crew/{crew_user_id}/alerts/{alert_id}/ack",
        { params: { path: { crew_user_id: crewId, alert_id: alertId } } },
      );
      if (!data) throw new Error("Unable to acknowledge the alert.");
      return data;
    },
    onSuccess: () => invalidateSurgeon(queryClient, crewId),
  });
}

export function useSimulateCrewCapture(crewId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.POST(
        "/surgeon/crew/{crew_user_id}/captures/simulate",
        { params: { path: { crew_user_id: crewId } } },
      );
      if (!data) throw new Error("Unable to simulate a capture.");
      return data;
    },
    onSuccess: () => invalidateSurgeon(queryClient, crewId),
  });
}

export function useSurgeonUpdates() {
  return useQuery({
    queryKey: queryKeys.surgeonUpdates,
    queryFn: async (): Promise<SurgeonUpdates> => {
      const { data } = await api.GET("/me/surgeon-updates");
      if (!data) throw new Error("Unable to load flight surgeon updates.");
      return data;
    },
  });
}

export function useAcknowledgeSurgeonUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instructionId: number): Promise<SurgeonInstruction> => {
      const { data } = await api.POST(
        "/me/surgeon-updates/{instruction_id}/ack",
        { params: { path: { instruction_id: instructionId } } },
      );
      if (!data) throw new Error("Unable to acknowledge the instruction.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.surgeonUpdates });
    },
  });
}
