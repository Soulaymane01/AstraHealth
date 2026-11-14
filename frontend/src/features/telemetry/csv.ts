import type { MetricSeries } from "@/lib/api/types";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function exportMetricCsv(series: MetricSeries): void {
  const rows: Array<Array<string | number | null>> = [
    ["measured_at", "value", "unit", "source", "confidence"],
    ...series.points.map((point) => [
      point.measured_at,
      point.value,
      series.metric.unit,
      point.source,
      point.confidence ?? null,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `astrahealth-${series.metric.code.replaceAll("_", "-")}-${series.range_days}d.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
