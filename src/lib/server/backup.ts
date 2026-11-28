import { gzipSync } from "zlib";
import { del, get, list, put } from "@vercel/blob";
import { redis, isSharedMode } from "./redis";
import {
  BACKUP_KEEP,
  BACKUP_NAME,
  BACKUP_PREFIX,
  backupFileName,
  backupPath,
  currentBackupWeek,
  weekOfBackupName,
  type BackupFile,
  type BackupKey,
} from "../shared/backup";

export type BackupListItem = { name: string; bytes: number; uploadedAt: string; week: string };

export type BackupRun = {
  ok: boolean;
  skipped?: boolean;
  message: string;
  name?: string;
  bytes?: number;
  keyCount?: number;
};

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function listBackups(): Promise<BackupListItem[]> {
  const items: BackupListItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: BACKUP_PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const name = blob.pathname.slice(BACKUP_PREFIX.length);
      const week = weekOfBackupName(name);
      if (!BACKUP_NAME.test(name) || !week) continue;
      items.push({ name, bytes: blob.size, uploadedAt: blob.uploadedAt.toISOString(), week });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  items.sort((a, b) => b.name.localeCompare(a.name));
  return items;
}

export async function createWeeklyBackup(at = new Date(), options?: { force?: boolean }): Promise<BackupRun> {
  if (!isSharedMode()) return { ok: false, message: "Dijeljena baza nije spojena." };
  if (!blobConfigured()) return { ok: false, message: "Spremište kopija nije spojeno." };
  const week = currentBackupWeek(at);
  const existing = (await listBackups()).find((item) => item.week === week);
  if (existing && !options?.force) {
    return { ok: true, skipped: true, message: "Kopija za ovaj tjedan već postoji.", name: existing.name, bytes: existing.bytes };
  }
  const keys = await dumpRedis();
  const file: BackupFile = { version: 1, createdAt: at.toISOString(), week, keyCount: keys.length, keys };
  const body = gzipSync(Buffer.from(JSON.stringify(file)));
  const name = backupFileName(week, at);
  await put(backupPath(name), body, {
    access: "private",
    contentType: "application/gzip",
    addRandomSuffix: false,
  });
  await trimBackups();
  return { ok: true, message: "Kopija je spremljena.", name, bytes: body.length, keyCount: keys.length };
}

export async function readBackup(name: string): Promise<{ body: ReadableStream<Uint8Array>; bytes: number } | null> {
  if (!BACKUP_NAME.test(name) || !blobConfigured()) return null;
  const result = await get(backupPath(name), { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return { body: result.stream, bytes: result.blob.size };
}

async function trimBackups() {
  const items = await listBackups();
  const extra = items.slice(BACKUP_KEEP);
  if (!extra.length) return;
  await del(extra.map((item) => backupPath(item.name)));
}

async function dumpRedis(): Promise<BackupKey[]> {
  const names = await scanKeys();
  const rows: BackupKey[] = [];
  for (const key of names) {
    const row = await dumpKey(key);
    if (row) rows.push(row);
  }
  return rows;
}

/** SCAN the whole keyspace. There is no MATCH filter, so aggregate keys and photo keys are both included. */
async function scanKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  for (let hop = 0; hop < 1000; hop += 1) {
    const result = await redis(["SCAN", cursor, "COUNT", "200"]);
    if (!Array.isArray(result) || result.length < 2) break;
    cursor = String(result[0]);
    const batch = result[1];
    if (Array.isArray(batch)) {
      for (const key of batch) if (typeof key === "string") keys.push(key);
    }
    if (cursor === "0") break;
  }
  return keys;
}

async function dumpKey(key: string): Promise<BackupKey | null> {
  const type = String(await redis(["TYPE", key]));
  if (!type || type === "none") return null;
  const ttlRaw = Number(await redis(["TTL", key]));
  const ttl = Number.isFinite(ttlRaw) ? ttlRaw : -1;
  let value: unknown = null;
  if (type === "string") value = await redis(["GET", key]);
  else if (type === "hash") value = await redis(["HGETALL", key]);
  else if (type === "list") value = await redis(["LRANGE", key, "0", "-1"]);
  else if (type === "set") value = await redis(["SMEMBERS", key]);
  else if (type === "zset") value = await redis(["ZRANGE", key, "0", "-1", "WITHSCORES"]);
  return { key, type, ttl, value };
}
