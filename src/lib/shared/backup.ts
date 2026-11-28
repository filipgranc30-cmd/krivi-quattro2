/** One backup per ISO week. The pathname is backups/{week}-{utc-timestamp}.json.gz */
export const BACKUP_PREFIX = "backups/";
export const BACKUP_KEEP = 12;
export const BACKUP_NAME = /^20\d{2}-W\d{2}-20\d{6}T\d{6}Z\.json\.gz$/;

export type BackupKey = {
  key: string;
  type: string;
  /** Seconds until expiry. -1 means no expiry. */
  ttl: number;
  value: unknown;
};

export type BackupFile = {
  version: 1;
  createdAt: string;
  week: string;
  keyCount: number;
  keys: BackupKey[];
};

export function zagrebDate(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function isSundayInZagreb(at = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zagreb", weekday: "short" }).format(at);
  return weekday === "Sun";
}

/** ISO week of a Zagreb calendar date (YYYY-MM-DD), for example 2026-W48. */
export function isoWeekId(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const weekYear = utc.getUTCFullYear();
  const start = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((utc.getTime() - start.getTime()) / 86400000 + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function currentBackupWeek(at = new Date()): string {
  return isoWeekId(zagrebDate(at));
}

export function backupFileName(week: string, at = new Date()): string {
  const stamp = at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${week}-${stamp}.json.gz`;
}

export function backupPath(name: string): string {
  return `${BACKUP_PREFIX}${name}`;
}

export function weekOfBackupName(name: string): string | null {
  const match = name.match(/^(20\d{2}-W\d{2})-/);
  return match ? match[1] : null;
}
