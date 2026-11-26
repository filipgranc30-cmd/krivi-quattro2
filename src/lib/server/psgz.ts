import { unstable_cache } from "next/cache";
import { FALLBACK_LEAGUES, OUR_LEAGUE_ID, OUR_LEAGUE_NAME, PSGZ_ORIGIN } from "../shared/club";
import { isOurClub, normName } from "../shared/util";
import type { LeagueBundle, LeagueInfo, Snapshot, SnapshotFixture } from "../shared/types";
import { fetchText, parseLeagueHtml, parseLeagueIndex, parseTeamAddress } from "./psgz-parse";

const REVALIDATE = 60 * 60 * 6;
const failedUntil = new Map<string, number>();

function rememberFailure(key: string) {
  failedUntil.set(key, Date.now() + 10 * 60 * 1000);
}

function recentlyFailed(key: string) {
  return (failedUntil.get(key) ?? 0) > Date.now();
}

async function loadLeague(id: number, name = ""): Promise<LeagueBundle> {
  const payload = await fetchText(
    `${PSGZ_ORIGIN}/site/uniondivision/UnionLeagueTable?unionId=2&seasonId=26&leagueId=${id}`,
  );
  const data = JSON.parse(payload) as { isValid?: boolean; html?: string };
  if (!data.isValid || !data.html) throw new Error("PSGZ nije vratio tablicu.");
  const bundle = parseLeagueHtml(data.html, id, name);
  if (!bundle.standings.length && !bundle.fixtures.length && !bundle.players.length) {
    throw new Error("Tablica je prazna ili je stranica promijenila oblik.");
  }
  return bundle;
}

async function loadIndex(): Promise<LeagueInfo[]> {
  const html = await fetchText(`${PSGZ_ORIGIN}/competitions`);
  const leagues = parseLeagueIndex(html);
  if (!leagues.length) throw new Error("Popis liga je prazan.");
  return leagues;
}

async function loadAddress(slug: string): Promise<string> {
  if (!slug) return "";
  const html = await fetchText(`${PSGZ_ORIGIN}/hps/${encodeURIComponent(slug)}`);
  return parseTeamAddress(html);
}

const cachedLeague = unstable_cache(loadLeague, ["psgz-league-v1"], { revalidate: REVALIDATE });
const cachedIndex = unstable_cache(loadIndex, ["psgz-index-v1"], { revalidate: REVALIDATE });
const cachedAddress = unstable_cache(loadAddress, ["psgz-address-v1"], { revalidate: 60 * 60 * 24 });

export async function getLeague(id: number, name = ""): Promise<LeagueBundle> {
  const key = `league:${id}`;
  if (recentlyFailed(key)) throw new Error("PSGZ je nedavno bio nedostupan.");
  try {
    const league = await cachedLeague(id, name);
    failedUntil.delete(key);
    return league;
  } catch (error) {
    rememberFailure(key);
    throw error;
  }
}

export async function getLeagueIndex(): Promise<LeagueInfo[]> {
  try {
    return await cachedIndex();
  } catch {
    return FALLBACK_LEAGUES;
  }
}

function toSnapshotFixture(
  row: LeagueBundle["fixtures"][number],
  venue: string,
): SnapshotFixture {
  const home = isOurClub(row.home);
  const opponent = home ? row.away : row.home;
  return {
    key: row.eventPath ? `psgz:${row.eventPath}` : `psgz:${row.datetime}:${opponent}`,
    round: row.round,
    datetime: row.datetime,
    opponent,
    home,
    venue,
    eventUrl: row.eventPath ? `${PSGZ_ORIGIN}${row.eventPath}` : `${PSGZ_ORIGIN}/ranking-table/${OUR_LEAGUE_ID}`,
    scoreUs: home ? row.scoreHome : row.scoreAway,
    scoreThem: home ? row.scoreAway : row.scoreHome,
    played: row.played,
    source: "psgz",
  };
}

export async function getSnapshot(): Promise<Snapshot> {
  const index = await getLeagueIndex();
  const meta = index.find((league) => league.id === OUR_LEAGUE_ID);
  const bundle = await getLeague(OUR_LEAGUE_ID, meta?.name || OUR_LEAGUE_NAME);
  const us = bundle.standings.find((row) => isOurClub(row.name));
  const ours = bundle.fixtures.filter((row) => isOurClub(row.home) || isOurClub(row.away));
  const fixtures = ours.map((row) => toSnapshotFixture(row, ""));
  const horizon = Date.now() - 12 * 60 * 60 * 1000;
  const nextBase =
    fixtures
      .filter((row) => !row.played && new Date(row.datetime).getTime() >= horizon)
      .sort((a, b) => a.datetime.localeCompare(b.datetime))[0] ?? null;

  let next = nextBase;
  if (nextBase) {
    const source = ours.find((row) => {
      const key = row.eventPath ? `psgz:${row.eventPath}` : "";
      return key && key === nextBase.key;
    });
    const slug = source ? (isOurClub(source.home) ? source.homeSlug : source.awaySlug) : "";
    let venue = "";
    if (slug) {
      try {
        venue = await cachedAddress(slug);
      } catch {
        venue = "";
      }
    }
    next = { ...nextBase, venue };
    const index = fixtures.findIndex((row) => row.key === nextBase.key);
    if (index >= 0) fixtures[index] = next;
  }

  const opponentName = next?.opponent ?? "";
  return {
    leagueId: bundle.id,
    leagueName: bundle.name,
    season: bundle.season,
    sourceUrl: bundle.sourceUrl,
    fetchedAt: bundle.fetchedAt,
    position: us?.position ?? null,
    points: us?.points ?? null,
    played: us?.played ?? null,
    ourPlayers: bundle.players.filter((player) => isOurClub(player.club)),
    fixtures,
    next,
    opponentPlayers: opponentName
      ? bundle.players.filter((player) => normName(player.club) === normName(opponentName))
      : [],
    standings: bundle.standings,
  };
}
