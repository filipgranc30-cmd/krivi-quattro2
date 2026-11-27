export type ZapisnikStat = { label: string; value: string };

export type ZapisnikGame = {
  order: number;
  stage: string;
  round: string;
  kind: "pojedinačno" | "parovi";
  home: string[];
  away: string[];
  homeScore: number | null;
  awayScore: number | null;
  homeWon: boolean;
  awayWon: boolean;
  homeAverage: string;
  awayAverage: string;
  detailPath: string | null;
  info: ZapisnikStat[];
};

export type ZapisnikPlayer = {
  team: string;
  name: string;
  games: number;
  wins: number;
  legsFor: number;
  legsAgainst: number;
};

export type Zapisnik = {
  id: string;
  title: string;
  round: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  sourceUrl: string;
  games: ZapisnikGame[];
  players: ZapisnikPlayer[];
};

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function num(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function splitPlayers(name: string): string[] {
  const parts = name.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : name ? [name] : [];
}

export function parseZapisnik(html: string, id: string): Zapisnik {
  const body = html.split('class="body-content"')[1] ?? html.split("body-content")[1] ?? html;
  const title = decode(body.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const home = decode(body.match(/up-game-home[\s\S]*?up-game-name[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
  const away = decode(body.match(/up-game-away[\s\S]*?up-game-name[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
  const homeScore = num(body.match(/up-game-home[\s\S]*?up-game-score[^>]*>([^<]*)</)?.[1]);
  const awayScore = num(body.match(/up-game-away[\s\S]*?up-game-score[^>]*>([^<]*)</)?.[1]);
  const round = title.match(/^(\d+\.\s*kolo)/i)?.[1] ?? "";
  const games = parseGames(body);
  return {
    id,
    title,
    round,
    home,
    away,
    homeScore,
    awayScore,
    sourceUrl: `https://psgz.hr/event/${id}`,
    games,
    players: summarize(home, away, games),
  };
}

function parseGames(body: string): ZapisnikGame[] {
  const sheet = body.split("up-game-teams")[1] ?? body;
  const token =
    /<div class="cgc-stage-title">([^<]*)<\/div>|<div class="cgc-round-title">([^<]*)<\/div>|<div class="cgc-match" id="([^"]+)">([\s\S]*?)(?=<div class="cgc-match"|<div class="cgc-round"|<div class="cgc-stage-title"|$)/g;
  const games: ZapisnikGame[] = [];
  let stage = "";
  let round = "";
  let match: RegExpExecArray | null;
  while ((match = token.exec(sheet))) {
    if (match[1]) {
      stage = decode(match[1]);
      continue;
    }
    if (match[2]) {
      round = decode(match[2]);
      continue;
    }
    const chunk = match[4] ?? "";
    const cols = chunk.split(/col-12 col-sm-6/).slice(1);
    const left = readSide(cols[0] ?? "");
    const right = readSide(cols[1] ?? "");
    if (!left.name && !right.name) continue;
    const kind = stage.toLowerCase().includes("par") || left.name.includes("/") ? "parovi" : "pojedinačno";
    games.push({
      order: games.length + 1,
      stage,
      round,
      kind,
      home: splitPlayers(left.name),
      away: splitPlayers(right.name),
      homeScore: left.score,
      awayScore: right.score,
      homeWon: left.winner,
      awayWon: right.winner,
      homeAverage: left.average,
      awayAverage: right.average,
      detailPath: left.detailPath || right.detailPath,
      info: [],
    });
  }
  return games;
}

function readSide(html: string): { name: string; score: number | null; winner: boolean; average: string; detailPath: string | null } {
  return {
    name: decode(html.match(/<a [^>]*>([\s\S]*?)<\/a>/)?.[1] ?? ""),
    score: num(html.match(/cgc-team-score[^>]*>([^<]*)</)?.[1]),
    winner: /cgc-team[^"]*winner/.test(html),
    average: decode(html.match(/cgc-team-avg[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ""),
    detailPath: html.match(/href="(\/event\/match\/[^"]+)"/)?.[1] ?? null,
  };
}

export function parseGameDetail(html: string): { info: ZapisnikStat[]; lines: { name: string; winner: boolean; cells: ZapisnikStat[] }[] } {
  const info = [...html.matchAll(/<div class="label">([^<]*)<\/div>\s*<div class="data">([^<]*)<\/div>/g)]
    .map((match) => ({ label: decode(match[1]).replace(/:$/, ""), value: decode(match[2]) }))
    .filter((item) => item.label && item.value && !(item.label === "Broj strelica" && item.value === "0"));
  const table = html.split("summary")[1] ?? "";
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((match) => decode(match[1])).filter(Boolean);
  const lines = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((match) => {
      const cells = [...match[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
      if (!cells.length) return null;
      const values = cells.map((cell) => ({
        winner: /winner/.test(cell[1]),
        text: decode(cell[2]),
      }));
      const name = values[0]?.text ?? "";
      if (!name || name === "Igrači") return null;
      return {
        name,
        winner: values.some((cell) => cell.winner),
        cells: values.slice(1).map((cell, index) => ({
          label: headers[index + 1] || `Stupac ${index + 2}`,
          value: cell.text,
        })).filter((cell) => cell.value),
      };
    })
    .filter((line): line is { name: string; winner: boolean; cells: ZapisnikStat[] } => Boolean(line));
  return { info, lines };
}

export function applyDetail(game: ZapisnikGame, detail: ReturnType<typeof parseGameDetail>): ZapisnikGame {
  const info = [...detail.info];
  for (const line of detail.lines) {
    for (const cell of line.cells) {
      if (cell.label.toLowerCase() === "rezultat") continue;
      info.push({ label: `${line.name} · ${cell.label}`, value: cell.value });
    }
  }
  return { ...game, info };
}

function summarize(homeTeam: string, awayTeam: string, games: ZapisnikGame[]): ZapisnikPlayer[] {
  const map = new Map<string, ZapisnikPlayer>();
  const add = (team: string, name: string, won: boolean, legsFor: number, legsAgainst: number) => {
    const key = `${team}|${name}`;
    const row = map.get(key) ?? { team, name, games: 0, wins: 0, legsFor: 0, legsAgainst: 0 };
    row.games += 1;
    if (won) row.wins += 1;
    row.legsFor += legsFor;
    row.legsAgainst += legsAgainst;
    map.set(key, row);
  };
  for (const game of games) {
    for (const name of game.home) add(homeTeam || "Doma", name, game.homeWon, game.homeScore ?? 0, game.awayScore ?? 0);
    for (const name of game.away) add(awayTeam || "Gosti", name, game.awayWon, game.awayScore ?? 0, game.homeScore ?? 0);
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || b.legsFor - a.legsFor || a.name.localeCompare(b.name, "hr"));
}
