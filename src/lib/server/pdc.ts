import { timingSafeEqual } from "node:crypto";
import { applyPdcImport, parsePdcTournament, tournamentNameOf, type PdcFixture } from "../shared/pdc";
import { cloneDailyDarts, DEFAULT_PDC_TOURNAMENT, tournamentIdsOf } from "../shared/daily-darts";
import { redis, isSharedMode } from "./redis";
import { readDb, updateDb } from "./store";

const UA = "KriviQuattroClubApp/1.0 (+https://krivi-quattro2.vercel.app; raspored PDC)";
const THROTTLE_KEY = "kq:pdc:sync-ms";
const THROTTLE_MS = 15 * 60 * 1000;

export type PdcSyncResult = { ok: boolean; skipped?: boolean; message: string; lastSyncAt?: string };

export async function fetchPdcTournament(tournamentId = DEFAULT_PDC_TOURNAMENT): Promise<{ id: string; name: string; fixtures: PdcFixture[] } | null> {
  const id = /^\d{3,8}$/.test(tournamentId) ? tournamentId : DEFAULT_PDC_TOURNAMENT;
  try {
    const response = await fetch(`https://tournaments.darts.web.gc.pdcservices.co.uk/v2/${id}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const fixtures = parsePdcTournament(body);
    if (!fixtures) return null;
    const name = tournamentNameOf(body) || `PDC ${id}`;
    return { id, name, fixtures: fixtures.map((fixture) => ({ ...fixture, tournamentId: id, tournamentName: name })) };
  } catch {
    return null;
  }
}

export async function syncPdc(options: { force?: boolean } = {}): Promise<PdcSyncResult> {
  if (!isSharedMode()) return { ok: false, message: "Dijeljena baza nije spojena. PDC sync treba Redis." };
  if (!options.force) {
    const stamp = await redis(["GET", THROTTLE_KEY]).catch(() => null);
    if (typeof stamp === "string" && Date.now() - Number(stamp) < THROTTLE_MS) {
      return { ok: true, skipped: true, message: "Sinkronizacija je svježa.", lastSyncAt: new Date(Number(stamp)).toISOString() };
    }
  }
  const current = await readDb();
  const ids = tournamentIdsOf(current.dailyDarts);
  const bundles = (await Promise.all(ids.map((id) => fetchPdcTournament(id)))).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!bundles.length) return { ok: false, message: "PDC raspored trenutno nije dostupan." };
  const fixtures = bundles.flatMap((bundle) => bundle.fixtures);
  let message = "";
  await updateDb((db) => {
    const applied = applyPdcImport(cloneDailyDarts(db.dailyDarts), fixtures);
    message = applied.message;
    db.dailyDarts = applied.state;
    return db;
  });
  const now = Date.now();
  await redis(["SET", THROTTLE_KEY, String(now)]).catch(() => undefined);
  return { ok: true, message, lastSyncAt: new Date(now).toISOString() };
}

export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
