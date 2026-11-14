import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { DomainSummary, MetricDefinition, MetricSeries } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

import type { RangeDays } from "@/features/telemetry/telemetry-config";

export function useMetricDefinitions() {
  return useQuery({
    queryKey: queryKeys.metricDefinitions,
    queryFn: async (): Promise<MetricDefinition[]> => {
      const { data } = await api.GET("/metrics/definitions");
      return data ?? [];
    },
  });
}

export function useMetricSeries(code: string | null, days: RangeDays) {
  return useQuery({
    queryKey: queryKeys.metricSeries(code ?? "none", days),
    queryFn: async (): Promise<MetricSeries> => {
      if (!code) throw new Error("No metric selected.");
      const { data, response } = await api.GET("/metrics/{code}/series", {
        params: { path: { code }, query: { days } },
      });
      if (response.status === 404) throw new Error("That metric could not be found.");
      if (!data) throw new Error("Unable to load the metric series.");
      return data;
    },
    enabled: Boolean(code),
    placeholderData: keepPreviousData,
  });
}

export function useDomainSummary(domain: string | null, days: RangeDays) {
  return useQuery({
    queryKey: queryKeys.domainSummary(domain ?? "none", days),
    queryFn: async (): Promise<DomainSummary> => {
      if (!domain) throw new Error("No domain selected.");
      const { data, response } = await api.GET("/domains/{domain}", {
        params: { path: { domain }, query: { days } },
      });
      if (response.status === 404) throw new Error("That domain could not be found.");
      if (!data) throw new Error("Unable to load the domain summary.");
      return data;
    },
    enabled: Boolean(domain),
    placeholderData: keepPreviousData,
  });
}
