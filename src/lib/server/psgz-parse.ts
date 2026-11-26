import { OUR_LEAGUE_NAME, PSGZ_ORIGIN } from "../shared/club";
import { parseCroatianDate } from "../shared/dates";
import type { FixtureRow, LeagueBundle, LeagueInfo, LeaguePlayer, StandingRow } from "../shared/types";

const UA = "KriviQuattroClubApp/1.0 (+https://krivi-quattro2.vercel.app; raspored kluba)";

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`PSGZ ${response.status} za ${url}`);
  return response.text();
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function num(value: string): number {
  const n = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function sliceBetween(html: string, start: RegExp, end: RegExp): string {
  const from = html.search(start);
  if (from < 0) return "";
  const rest = html.slice(from);
  const relativeEnd = rest.search(end);
  return relativeEnd > 0 ? rest.slice(0, relativeEnd) : rest;
}

export function parseLeagueIndex(html: string): LeagueInfo[] {
  const select = html.match(/id="SeasonTable_LeagueId"[\s\S]*?<\/select>/i)?.[0] ?? "";
  const leagues: LeagueInfo[] = [];
  let group = "Natjecanja";
  const token = /<optgroup[^>]*label="([^"]+)"[^>]*>|<\/optgroup>|<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/gi;
  let match: RegExpExecArray | null;
  while ((match = token.exec(select))) {
    if (match[1]) group = decode(match[1]);
    else if (match[2] && match[2] !== "0") {
      leagues.push({ id: Number(match[2]), name: decode(match[3] || ""), group });
    }
  }
  return leagues;
}

export function parseLeagueHtml(html: string, leagueId: number, fallbackName = ""): LeagueBundle {
  const title = html.match(/class="league-preview"[^>]*title="([^"]+)"/i)?.[1];
  const name = decode(title || fallbackName || `Liga ${leagueId}`);
  const standings = parseStandings(html, leagueId);
  const fixtures = parseFixtures(html, leagueId);
  const players = parsePlayers(html, leagueId);
  return {
    id: leagueId,
    name: name || fallbackName || OUR_LEAGUE_NAME,
    season: "2026/27",
    sourceUrl: `${PSGZ_ORIGIN}/ranking-table/${leagueId}`,
    fetchedAt: new Date().toISOString(),
    standings,
    fixtures,
    players,
  };
}

function parseStandings(html: string, leagueId: number): StandingRow[] {
  const section = sliceBetween(html, new RegExp(`id="leaguetab${leagueId}"`, "i"), new RegExp(`id="rasporedtab${leagueId}"`, "i"));
  const rows = [...section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  const standings: StandingRow[] = [];
  for (const row of rows) {
    const chunk = row[1];
    const position = chunk.match(/class="pos[^"]*">(\d+)/)?.[1];
    const crew = chunk.match(/class="crew"[^>]*data-crew-id="(\d+)"[^>]*>([^<]+)/);
    if (!position || !crew) continue;
    const cells = [...chunk.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((cell) => decode(cell[2]));
    standings.push({
      position: Number(position),
      crewId: crew[1],
      name: decode(crew[2]),
      points: num(cells[2] || "0"),
      played: num(cells[3] || "0"),
      won: num(cells[4] || "0"),
      draw: cells[5] || "",
      lost: num(cells[6] || "0"),
      legs: cells[7] || "",
      sets: cells[8] || "",
    });
  }
  return standings;
}

function parseFixtures(html: string, leagueId: number): FixtureRow[] {
  const section = sliceBetween(
    html,
    new RegExp(`id="rasporedtab${leagueId}"`, "i"),
    new RegExp(`id="igracitab${leagueId}"`, "i"),
  );
  const fixtures: FixtureRow[] = [];
  let round = "";
  const token =
    /<div class="thead">\s*<div><b>([^<]+)<\/b><\/div>\s*<\/div>|<div class="table-game-row">([\s\S]*?)(?=<div class="table-game-row">|<div class="thead">|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = token.exec(section))) {
    if (match[1]) {
      round = decode(match[1]);
      continue;
    }
    const row = match[2] || "";
    const dateLabel = decode(row.match(/<div class="date">([^<]+)/)?.[1] || "");
    const datetime = parseCroatianDate(dateLabel);
    const homeBlock = row.match(/class="team home"[\s\S]*?<\/div>/i)?.[0] || "";
    const awayBlock = row.match(/class="team away"[\s\S]*?<\/div>/i)?.[0] || "";
    const home = decode(homeBlock.match(/title="([^"]+)"/)?.[1] || "");
    const away = decode(awayBlock.match(/title="([^"]+)"/)?.[1] || "");
    if (!home || !away || !datetime) continue;
    const homeScoreRaw = row.match(/<span class="home">([^<]*)/)?.[1] ?? "";
    const awayScoreRaw = row.match(/<span class="away">([^<]*)/)?.[1] ?? "";
    const scoreHome = homeScoreRaw.trim() === "" ? null : num(homeScoreRaw);
    const scoreAway = awayScoreRaw.trim() === "" ? null : num(awayScoreRaw);
    const eventPath = row.match(/href="(\/event\/[^"]+)"/)?.[1] || "";
    const kickoff = new Date(datetime).getTime();
    const played = (scoreHome ?? 0) + (scoreAway ?? 0) > 0 || (kickoff < Date.now() - 18 * 60 * 60 * 1000 && (scoreHome !== 0 || scoreAway !== 0));
    const zeroZero = (scoreHome ?? 0) === 0 && (scoreAway ?? 0) === 0;
    fixtures.push({
      round,
      datetime,
      dateLabel,
      home,
      away,
      homeSlug: homeBlock.match(/href="\/hps\/([^"]+)"/)?.[1] || "",
      awaySlug: awayBlock.match(/href="\/hps\/([^"]+)"/)?.[1] || "",
      scoreHome: zeroZero ? 0 : scoreHome,
      scoreAway: zeroZero ? 0 : scoreAway,
      eventPath,
      played: zeroZero ? false : played,
    });
  }
  return fixtures;
}

function parsePlayers(html: string, leagueId: number): LeaguePlayer[] {
  const section = sliceBetween(html, new RegExp(`id="igracitab${leagueId}"`, "i"), new RegExp(`id="ekipetab${leagueId}"`, "i"));
  const players: LeaguePlayer[] = [];
  const rows = [...section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const chunk = row[1];
    const name = chunk.match(/<span class="player">([^<]+)/)?.[1];
    if (!name) continue;
    const cells = [...chunk.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((cell) => decode(cell[2]));
    players.push({
      rank: cells[0] || "",
      playerId: chunk.match(/data-player-id="(\d+)"/)?.[1] || "",
      name: decode(name),
      club: decode(chunk.match(/<span class="crew">([^<]+)/)?.[1] || cells[2] || ""),
      points: num(cells[4] || "0"),
      winPct: num(cells[5] || "0"),
      played: num(cells[6] || "0"),
      wl: cells[7] || "",
      legs: cells[8] || "",
    });
  }
  return players;
}

export function parseTeamAddress(html: string): string {
  const text = decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "));
  const match = text.match(/Adresa\s+(.+?)\s+Grad\b/);
  const address = match?.[1]?.trim() ?? "";
  if (!address || address.length > 80) return "";
  return address;
}
