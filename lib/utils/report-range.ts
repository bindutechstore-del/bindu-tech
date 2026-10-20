/**
 * The date window for admin → Reports: a preset ("This month", "Last year" …)
 * or a custom From–To, always in Dhaka time (UTC+6, no daylight saving), so
 * "1 October" means the shop's 1 October and not UTC's.
 */

export type Bucket = "day" | "month";

export interface ReportRange {
  /** Preset key, or "custom". */
  key: string;
  label: string;
  /** Inclusive Dhaka dates, YYYY-MM-DD. */
  from: string;
  to: string;
  /** UTC instants for the query: [fromIso, toIsoExclusive). */
  fromIso: string;
  toIsoExclusive: string;
  days: number;
  /** Long ranges chart by month so the chart stays readable. */
  bucket: Bucket;
}

export const RANGE_PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-year", label: "This year" },
  { key: "last-year", label: "Last year" },
] as const;

const DHAKA_MS = 6 * 60 * 60 * 1000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** A report can span at most this many days (three years). */
const MAX_DAYS = 1096;

/** Today's date in Dhaka. */
export function todayDhaka(): string {
  return new Date(Date.now() + DHAKA_MS).toISOString().slice(0, 10);
}

/** The Dhaka calendar date of a timestamp. */
export function dhakaDate(ts: string | number | Date): string {
  return new Date(new Date(ts).getTime() + DHAKA_MS).toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Midnight in Dhaka at the start of `ymd`, as a UTC ISO string. */
function startOfDhakaDay(ymd: string): string {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() - DHAKA_MS).toISOString();
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
}

function valid(ymd: string | undefined): ymd is string {
  return Boolean(ymd && YMD.test(ymd) && !Number.isNaN(Date.parse(`${ymd}T00:00:00Z`)));
}

function build(key: string, label: string, from: string, to: string): ReportRange {
  const days = daysBetween(from, to);
  return {
    key,
    label,
    from,
    to,
    fromIso: startOfDhakaDay(from),
    toIsoExclusive: startOfDhakaDay(addDays(to, 1)),
    days,
    bucket: days > 92 ? "month" : "day",
  };
}

/** Read the window from the page's search params. Defaults to the last 30 days. */
export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
  days?: string;
}): ReportRange {
  const today = todayDhaka();

  if (valid(params.from) && valid(params.to)) {
    let [from, to] = params.from <= params.to ? [params.from, params.to] : [params.to, params.from];
    if (to > today) to = today;
    if (from > to) from = to;
    if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
    return build("custom", "Custom range", from, to);
  }

  // Old links used ?days=N.
  const key = params.range ?? (params.days ? `${Number(params.days)}d` : "30d");
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (key) {
    case "this-month":
      return build(key, "This month", `${y}-${pad(m)}-01`, today);
    case "last-month": {
      const firstThis = `${y}-${pad(m)}-01`;
      const lastPrev = addDays(firstThis, -1);
      return build(key, "Last month", `${lastPrev.slice(0, 7)}-01`, lastPrev);
    }
    case "this-year":
      return build(key, "This year", `${y}-01-01`, today);
    case "last-year":
      return build(key, "Last year", `${y - 1}-01-01`, `${y - 1}-12-31`);
    default: {
      const n = Number(key.replace(/d$/, ""));
      const days = [7, 30, 90, 180].includes(n) ? n : 30;
      return build(`${days}d`, `Last ${days} days`, addDays(today, -(days - 1)), today);
    }
  }
}

/** Every bucket key in the range, in order: YYYY-MM-DD for days, YYYY-MM for months. */
export function bucketKeys(range: ReportRange): string[] {
  const keys: string[] = [];
  if (range.bucket === "day") {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) keys.push(d);
  } else {
    let [y, m] = range.from.split("-").map(Number);
    const [ty, tm] = range.to.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      keys.push(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return keys;
}

export function bucketLabel(key: string, bucket: Bucket): string {
  return bucket === "day"
    ? new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    : new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}
