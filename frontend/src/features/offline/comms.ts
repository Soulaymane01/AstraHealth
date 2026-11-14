const COMMS_WINDOW_MINUTES = 30;

export function nextCommsWindow(now: Date = new Date()): Date {
  const windowMs = COMMS_WINDOW_MINUTES * 60_000;
  return new Date(Math.ceil((now.getTime() + 1) / windowMs) * windowMs);
}

export function formatCommsWindow(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export { COMMS_WINDOW_MINUTES };
