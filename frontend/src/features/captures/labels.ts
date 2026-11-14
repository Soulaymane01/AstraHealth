export const CAPTURE_SOURCE_LABELS: Record<string, string> = {
  iss_capture: "ISS habitat sensors",
  lunar_capture: "Lunar surface sensors",
  mars_capture: "Mars transit sensors",
};

export function captureSourceLabel(source: string | null | undefined): string {
  if (!source) return "Sensor capture";
  return CAPTURE_SOURCE_LABELS[source] ?? source;
}

export function isCaptureSource(source: string | null | undefined): boolean {
  return source === "iss_capture" || source === "lunar_capture" || source === "mars_capture";
}
