import { emptyDb } from "../shared/seed";
import type { Db } from "../shared/types";
import { uid } from "../shared/util";
import { redis } from "./redis";

const KEY = "kq:state:v1";
const LOCK = "kq:lock";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readDb(): Promise<Db> {
  const raw = await redis(["GET", KEY]);
  if (typeof raw !== "string" || !raw) return emptyDb();
  try {
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || !Array.isArray(parsed.users)) return emptyDb();
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: Db) {
  const saved = await redis(["SET", KEY, JSON.stringify(db)]);
  if (saved !== "OK") throw new Error("Spremanje nije uspjelo.");
}

export async function updateDb(mutator: (db: Db) => Db | Promise<Db>): Promise<Db> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = uid();
    const locked = await redis(["SET", LOCK, token, "NX", "EX", "8"]);
    if (locked !== "OK") {
      await sleep(40 + attempt * 50);
      continue;
    }
    try {
      const current = await readDb();
      const next = await mutator(current);
      await writeDb(next);
      return next;
    } finally {
      const owner = await redis(["GET", LOCK]);
      if (owner === token) await redis(["DEL", LOCK]);
    }
  }
  throw new Error("Poslužitelj je zauzet, pokušaj ponovno.");
}
