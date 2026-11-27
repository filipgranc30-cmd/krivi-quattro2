import { unstable_cache } from "next/cache";
import { todayZagreb } from "../shared/dates";
import { normalizeTournaments, upcomingTournaments, type Tournament } from "../shared/turniri";

const URL = "https://rundapikada.com/api/tournaments";
const UA = "KriviQuattroClubApp/1.0 (+https://krivi-quattro2.vercel.app; raspored turnira)";

export type TournamentFeed = { ok: true; tournaments: Tournament[] } | { ok: false; tournaments: [] };

export async function getUpcomingTournaments(): Promise<TournamentFeed> {
  const today = todayZagreb();
  return unstable_cache(() => loadUpcoming(today), ["rundapikada-upcoming-v1", today], { revalidate: 60 * 60 })();
}

async function loadUpcoming(today: string): Promise<TournamentFeed> {
  try {
    const response = await fetch(URL, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, tournaments: [] };
    const body: unknown = await response.json();
    const list = normalizeTournaments(body);
    if (!list) return { ok: false, tournaments: [] };
    return { ok: true, tournaments: upcomingTournaments(list, today) };
  } catch {
    return { ok: false, tournaments: [] };
  }
}
