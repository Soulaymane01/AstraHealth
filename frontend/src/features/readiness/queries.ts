import { useQuery } from "@tanstack/react-query";

import { useSessionStore } from "@/features/session/session-store";
import { readClinical, writeClinical } from "@/features/offline/clinical-cache";
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
  const userId = useSessionStore((state) => state.user?.id);
  const cached = readClinical<Readiness | null>(userId, "readiness");
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: async (): Promise<Readiness | null> => {
      const data = await fetchReadiness();
      writeClinical(userId, "readiness", data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}

export function useReadinessHistory(limit = 2) {
  const userId = useSessionStore((state) => state.user?.id);
  const cached = readClinical<Readiness[]>(userId, `readiness-history-${limit}`);
  return useQuery({
    queryKey: queryKeys.readinessHistory(limit),
    queryFn: async (): Promise<Readiness[]> => {
      const { data } = await api.GET("/readiness/history", {
        params: { query: { limit } },
      });
      if (!data) throw new Error("Unable to load readiness history.");
      writeClinical(userId, `readiness-history-${limit}`, data);
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}

export function useDomainDetail(domain: string | null) {
  const userId = useSessionStore((state) => state.user?.id);
  const cached = readClinical<DomainDetail>(userId, `domain-${domain ?? "none"}`);
  return useQuery({
    queryKey: queryKeys.readinessDomain(domain ?? "none"),
    queryFn: async (): Promise<DomainDetail> => {
      if (!domain) throw new Error("No domain selected.");
      const { data } = await api.GET("/readiness/domains/{domain}", {
        params: { path: { domain } },
      });
      if (!data) throw new Error("Unable to load domain detail.");
      writeClinical(userId, `domain-${domain}`, data);
      return data;
    },
    enabled: Boolean(domain),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
}
