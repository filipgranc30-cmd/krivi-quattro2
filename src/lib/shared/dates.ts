function lastSunday(year: number, monthIndex: number): number {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12));
  return last.getUTCDate() - last.getUTCDay();
}

/** Croatian daylight saving: last Sunday in March through last Sunday in October. */
export function isCest(year: number, month: number, day: number): boolean {
  if (month < 3 || month > 10) return false;
  if (month > 3 && month < 10) return true;
  const switchDay = lastSunday(year, month === 3 ? 2 : 9);
  return month === 3 ? day >= switchDay : day < switchDay;
}

export function parseCroatianDate(raw: string): string | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = m[4].padStart(2, "0");
  const minute = m[5];
  const second = (m[6] ?? "00").padStart(2, "0");
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const offset = isCest(year, month, day) ? "+02:00" : "+01:00";
  const parsed = new Date(`${date}T${hour}:${minute}:${second}${offset}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function fromDatetimeLocal(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const offset = isCest(year, month, day) ? "+02:00" : "+01:00";
  const parsed = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00${offset}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toDatetimeLocal(iso: string): string {
  const parts = zagrebParts(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function todayZagreb(now = new Date()): string {
  const parts = zagrebParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

export function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDays(isoDate, diff);
}

const WEEKDAYS = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

export function weekdayName(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

export function formatDateHr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${Number(d)}.${Number(m)}.${y}.`;
}

type Parts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  weekday: string;
};

function zagrebParts(date: Date): Parts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    weekday: get("weekday"),
  };
}

const WEEKDAY_HR: Record<string, string> = {
  Monday: "ponedjeljak",
  Tuesday: "utorak",
  Wednesday: "srijeda",
  Thursday: "četvrtak",
  Friday: "petak",
  Saturday: "subota",
  Sunday: "nedjelja",
};

export function formatWhen(iso: string): { date: string; time: string; weekday: string; label: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "", weekday: "", label: "" };
  }
  const parts = zagrebParts(date);
  const weekday = WEEKDAY_HR[parts.weekday] ?? parts.weekday;
  const prettyDate = `${Number(parts.day)}.${Number(parts.month)}.${parts.year}.`;
  const time = `${parts.hour}:${parts.minute}`;
  return {
    date: prettyDate,
    time,
    weekday,
    label: `${weekday} ${prettyDate} u ${time}`,
  };
}
