import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Quiz, QuizListItem, QuizResult } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useQuizzes() {
  return useQuery({
    queryKey: queryKeys.quizzes,
    queryFn: async (): Promise<QuizListItem[]> => {
      const { data } = await api.GET("/quizzes");
      return data ?? [];
    },
  });
}

export function useQuiz(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.quiz(slug ?? "none"),
    queryFn: async (): Promise<Quiz> => {
      if (!slug) throw new Error("No quiz selected.");
      const { data, response } = await api.GET("/quizzes/{slug}", {
        params: { path: { slug } },
      });
      if (response.status === 404) throw new Error("That quiz could not be found.");
      if (!data) throw new Error("Unable to load the quiz.");
      return data;
    },
    enabled: Boolean(slug),
  });
}

export function useSubmitQuiz(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      answers: number[];
      subject_user_id?: number;
    }): Promise<QuizResult> => {
      const { data, response } = await api.POST("/quizzes/{slug}/submit", {
        params: { path: { slug } },
        body: payload,
      });
      if (response.status === 403) {
        throw new Error("That crewmate has not consented to share their status.");
      }
      if (response.status === 400) {
        throw new Error("Select an eligible crewmate before starting this quiz.");
      }
      if (response.status === 422) {
        throw new Error("Answer every question before submitting.");
      }
      if (!data) throw new Error("Unable to submit the quiz.");
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.quizzes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.quiz(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gamification }),
        queryClient.invalidateQueries({ queryKey: queryKeys.credits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.achievements }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missionLog }),
      ]);
    },
  });
}
