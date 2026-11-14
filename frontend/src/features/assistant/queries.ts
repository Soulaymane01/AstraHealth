import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { AssistantAnswer, AssistantSuggestion } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useAssistantSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.assistantSuggestions,
    queryFn: async (): Promise<AssistantSuggestion[]> => {
      const { data } = await api.GET("/assistant/suggestions");
      return data ?? [];
    },
    enabled,
  });
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: async (question: string): Promise<AssistantAnswer> => {
      const { data, response } = await api.POST("/assistant/ask", {
        body: { question },
      });
      if (!data) {
        if (response.status === 422) {
          throw new Error("Ask a shorter question and try again.");
        }
        throw new Error("The Flight Surgeon could not answer right now.");
      }
      return data;
    },
  });
}
