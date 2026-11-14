import type { TrainingRoster, TrainingRosterItem } from "@/lib/api/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function durationFor(item: TrainingRosterItem): number {
  if (item.kind === "training") return 25;
  if (item.kind === "sleep") return 30;
  if (item.kind === "checkin") return 10;
  return 5;
}

/**
 * Build a floating-time .ics file for today's Duty Roster. It is intentionally
 * small: no server scheduler or push permission is needed, and the crew can
 * import the day into the calendar they already use.
 */
export function exportRosterIcs(roster: TrainingRoster): void {
  const [year, month, day] = roster.date.split("-").map(Number);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate(),
  )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AstraHealth//Duty Roster//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AstraHealth Duty Roster",
  ];

  roster.items.forEach((item, index) => {
    const [hours, minutes] = item.time.split(":").map(Number);
    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(start.getTime() + durationFor(item) * 60_000);
    const startText = `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
    const endText = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(
      end.getDate(),
    )}T${pad(end.getHours())}${pad(end.getMinutes())}00`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:astrahealth-${roster.date}-${index}@astra.health`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${startText}`,
      `DTEND:${endText}`,
      `SUMMARY:${escapeText(`AstraHealth · ${item.title}`)}`,
      `DESCRIPTION:${escapeText(`${item.detail} Status: ${item.status}. Guidance, not a diagnosis.`)}`,
      `STATUS:${item.status === "done" ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `astrahealth-roster-${roster.date}.ics`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
