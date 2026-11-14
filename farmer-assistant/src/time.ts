const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface DenverDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/** Calendar date in America/Denver for an instant. Storage stays UTC. */
export function denverDate(date: Date): DenverDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAYS[get("weekday")];
  if (weekday === undefined) throw new Error(`unknown weekday ${get("weekday")}`);
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday,
  };
}

export function ymdAdd(year: number, month: number, day: number, days: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Monday that starts the next calendar week in America/Denver.
 * The bot calls this "next week". On a Monday, that is seven days ahead.
 */
export function activeMarketWeekStart(now: Date = new Date()): string {
  const { year, month, day, weekday } = denverDate(now);
  const sinceMonday = weekday === 0 ? 6 : weekday - 1;
  return ymdAdd(year, month, day, -sinceMonday + 7);
}

export function formatWeekLabel(weekStart: string): string {
  const [year, month, day] = weekStart.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, 18));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
  })
    .format(dt)
    .toLowerCase();
}

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}
