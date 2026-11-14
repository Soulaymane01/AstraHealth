import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { KnowledgeArticle, KnowledgeArticleSummary } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useKnowledgeArticles(domain?: string) {
  return useQuery({
    queryKey: queryKeys.knowledgeArticles(domain ?? "all"),
    queryFn: async (): Promise<KnowledgeArticleSummary[]> => {
      const { data } = await api.GET("/knowledge", {
        params: { query: domain ? { domain } : {} },
      });
      return data ?? [];
    },
  });
}

export function useKnowledgeArticle(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.knowledgeArticle(slug ?? "none"),
    queryFn: async (): Promise<KnowledgeArticle> => {
      if (!slug) throw new Error("No article selected.");
      const { data, response } = await api.GET("/knowledge/{slug}", {
        params: { path: { slug } },
      });
      if (response.status === 404) throw new Error("That article could not be found.");
      if (!data) throw new Error("Unable to load the article.");
      return data;
    },
    enabled: Boolean(slug),
  });
}
