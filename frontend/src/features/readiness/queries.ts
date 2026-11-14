import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { DomainDetail, Readiness } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export async function fetchReadiness(): Promise<Readiness | null> {
  const { data, response } = await api.GET("/readiness");
  if (response.status === 404) return null;
  if (!data) throw new Error("Unable to load readiness.");
  return data;
}

export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: fetchReadiness,
  });
}

export function useReadinessHistory(limit = 2) {
  return useQuery({
    queryKey: queryKeys.readinessHistory(limit),
    queryFn: async () => {
      const { data } = await api.GET("/readiness/history", {
        params: { query: { limit } },
      });
      return data ?? [];
    },
  });
}

export function useDomainDetail(domain: string | null) {
  return useQuery({
    queryKey: queryKeys.readinessDomain(domain ?? "none"),
    queryFn: async (): Promise<DomainDetail> => {
      if (!domain) throw new Error("No domain selected.");
      const { data } = await api.GET("/readiness/domains/{domain}", {
        params: { path: { domain } },
      });
      if (!data) throw new Error("Unable to load domain detail.");
      return data;
    },
    enabled: Boolean(domain),
  });
}
