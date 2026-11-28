/**
 * Restore a Krivi Quattro Redis backup. There is no restore button in the app.
 *
 * 1. Sign in as admin and download a file from Sigurnosne kopije (Više).
 * 2. Export the Redis REST variables in the shell. Do not commit them and do not paste them into chat.
 *    KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN).
 * 3. Restore:
 *      npx tsx scripts/restore-backup.ts path/to/2026-W48-20261129T110000Z.json.gz
 *    Add --dry-run to print only the key count and types.
 *
 * The script overwrites keys that are in the file and sets their TTL from the snapshot.
 * It does not delete keys that the backup does not contain.
 */
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { redis } from "../src/lib/server/redis";
import type { BackupFile, BackupKey } from "../src/lib/shared/backup";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
  const dry = process.argv.includes("--dry-run");
  const file = args[0];
  if (!file) {
    console.error("Navedi putanju do .json.gz kopije.");
    process.exit(1);
  }
  const backup = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as BackupFile;
  if (backup.version !== 1 || !Array.isArray(backup.keys)) {
    console.error("Datoteka nije kopija verzije 1.");
    process.exit(1);
  }
  const types: Record<string, number> = {};
  for (const row of backup.keys) types[row.type] = (types[row.type] ?? 0) + 1;
  console.log(`Tjedan ${backup.week}, ključeva ${backup.keys.length}, vrste ${JSON.stringify(types)}`);
  if (dry) return;
  for (const row of backup.keys) await restoreKey(row);
  console.log("Vraćeno.");
}

async function restoreKey(row: BackupKey) {
  if (!row.key || row.type === "none") return;
  if (row.type === "string") {
    if (typeof row.value !== "string") return;
    await redis(["SET", row.key, row.value]);
  } else if (row.type === "hash") {
    const fields = entries(row.value);
    await redis(["DEL", row.key]);
    if (fields.length) await redis(["HSET", row.key, ...fields.flat()]);
  } else if (row.type === "list") {
    const values = strings(row.value);
    await redis(["DEL", row.key]);
    if (values.length) await redis(["RPUSH", row.key, ...values]);
  } else if (row.type === "set") {
    const values = strings(row.value);
    await redis(["DEL", row.key]);
    if (values.length) await redis(["SADD", row.key, ...values]);
  } else if (row.type === "zset") {
    const pairs = scorePairs(row.value);
    await redis(["DEL", row.key]);
    if (pairs.length) await redis(["ZADD", row.key, ...pairs.flatMap(([member, score]) => [score, member])]);
  } else {
    return;
  }
  if (row.ttl > 0) await redis(["EXPIRE", row.key, String(row.ttl)]);
}

function entries(value: unknown): [string, string][] {
  if (Array.isArray(value)) {
    const pairs: [string, string][] = [];
    for (let index = 0; index < value.length; index += 2) {
      pairs.push([String(value[index]), String(value[index + 1] ?? "")]);
    }
    return pairs;
  }
  if (value && typeof value === "object") return Object.entries(value).map(([field, item]) => [field, String(item)]);
  return [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function scorePairs(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  const pairs: [string, string][] = [];
  for (let index = 0; index < value.length; index += 2) pairs.push([String(value[index]), String(value[index + 1] ?? "0")]);
  return pairs;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Vraćanje nije uspjelo.");
  process.exit(1);
});
