import { unstable_cache } from "next/cache";
import { PSGZ_ORIGIN } from "../shared/club";
import { todayZagreb } from "../shared/dates";
import { fetchText } from "./psgz-parse";
import { applyDetail, parseGameDetail, parseZapisnik, type Zapisnik } from "./zapisnik-parse";

const SLUG = /^[A-Za-z0-9]{4,40}$/;

export function validZapisnikId(id: string): boolean {
  return SLUG.test(id);
}

async function mapPool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function loadZapisnik(id: string): Promise<Zapisnik> {
  const html = await fetchText(`${PSGZ_ORIGIN}/event/${id}`);
  if (!html.includes("up-game-teams") && !html.includes("cgc-match")) {
    throw new Error("Zapisnik nije pronađen.");
  }
  const report = parseZapisnik(html, id);
  const paths = [...new Set(report.games.map((game) => game.detailPath).filter((path): path is string => Boolean(path)))];
  const details = await mapPool(paths, 4, async (path) => {
    try {
      const page = await fetchText(`${PSGZ_ORIGIN}${path}`);
      return [path, parseGameDetail(page)] as const;
    } catch {
      return [path, null] as const;
    }
  });
  const byPath = new Map(details);
  report.games = report.games.map((game) => {
    const detail = game.detailPath ? byPath.get(game.detailPath) : null;
    return detail ? applyDetail(game, detail) : game;
  });
  return report;
}

export async function getZapisnik(id: string, playedAt?: string | null): Promise<Zapisnik> {
  if (!validZapisnikId(id)) throw new Error("Nepoznat zapisnik.");
  const seconds = playedAt && isToday(playedAt) ? 60 * 15 : 60 * 60 * 6;
  return unstable_cache(() => loadZapisnik(id), ["psgz-zapisnik-v1", id, String(seconds)], { revalidate: seconds })();
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return day === todayZagreb();
}
