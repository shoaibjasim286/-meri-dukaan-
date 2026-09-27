export function rs(value: number): string {
  const n = Math.round((value + Number.EPSILON) * 100) / 100;
  const neg = n < 0;
  const body = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
  return `${neg ? "-" : ""}Rs ${body}`;
}

export function num(value: number): string {
  return value.toLocaleString("en-US");
}

/** Safe money math: keep 2 decimal precision without float drift. */
export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function daysAgoIso(days: number, hour = 11, minute = 20): string {
  const base = new Date("2026-09-25T00:00:00");
  base.setDate(base.getDate() - days);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

export const TODAY_ISO = "2026-09-25";

export function isSameDay(iso: string, dayIso: string): boolean {
  return iso.slice(0, 10) === dayIso.slice(0, 10);
}
