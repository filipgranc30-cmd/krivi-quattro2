import type { GamePlayerResult, SavedGame } from "./types";
import { normName } from "./util";

export type TrainingPlayer = { name: string; userId?: string };

export type RankColumn = { label: string; hint: string };

export type RankedRow = {
  rank: number;
  name: string;
  userId?: string;
  values: string[];
};

export type MatchDetailLine = { label: string; value: string };

export type MatchCard = {
  id: string;
  playedAt: string;
  score: string;
  players: string;
  averages: string;
  playersDetail: { name: string; won: boolean; lines: MatchDetailLine[] }[];
};

export type TrainingBoard = {
  type: SavedGame["type"];
  title: string;
  subtitle: string;
  tab: string;
  columns: RankColumn[];
  rows: RankedRow[];
  matches: MatchCard[];
};

const DASH = "-";

export function formatHr(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

export function trainingPlayers(input: {
  members: { id: string; name: string }[];
  roster: { name: string; demo?: boolean }[];
  user?: { id: string; name: string } | null;
}): TrainingPlayer[] {
  const list: TrainingPlayer[] = [];
  const seen = new Set<string>();
  const add = (person: TrainingPlayer) => {
    const key = normName(person.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push(person);
  };
  for (const member of input.members) add({ name: member.name, userId: member.id });
  if (input.user?.name) add({ name: input.user.name, userId: input.user.id });
  for (const player of input.roster) {
    if (player.demo) continue;
    add({ name: player.name });
  }
  return list;
}

type Accum = {
  name: string;
  userId?: string;
  matches: number;
  wins: number;
  primary: number | null;
  extras: (number | null)[];
};

export function trainingBoards(players: TrainingPlayer[], games: SavedGame[]): TrainingBoard[] {
  const ordered = [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  return [
    board501(players, ordered),
    boardCricket(players, ordered),
    boardMarathon(players, ordered),
    boardHighScore(players, ordered),
  ];
}

function board501(players: TrainingPlayer[], games: SavedGame[]): TrainingBoard {
  const rows = rank(players, games, "501", (player, row) => {
    if (player.dartsThrown && player.dartsThrown > 0) {
      row.points += player.pointsScored || 0;
      row.darts += player.dartsThrown;
      row.legs += player.legsPlayed || 0;
    } else if (player.threeDartAvg) {
      row.legacySum += player.threeDartAvg;
      row.legacyN += 1;
    }
    if (player.bestLegDarts && (row.bestLeg == null || player.bestLegDarts < row.bestLeg)) row.bestLeg = player.bestLegDarts;
    row.oneEighty += player.count180 || 0;
  });
  return {
    type: "501",
    title: "501 DO",
    subtitle: "Utakmice, pobjede, prosjek, najbolji leg i strelice po legu.",
    tab: "501",
    columns: [
      { label: "M", hint: "Mečevi" },
      { label: "P", hint: "Pobjede" },
      { label: "%", hint: "Postotak pobjeda" },
      { label: "Prosjek", hint: "Prosjek 3 strelice" },
      { label: "Najbolji leg", hint: "Najmanje strelica u dobivenom legu" },
      { label: "Str/leg", hint: "Strelice po legu" },
      { label: "180", hint: "Ukupno 180" },
    ],
    rows: rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      userId: row.userId,
      values: statCells(row, [
        { kind: "num", digits: 2 },
        { kind: "int" },
        { kind: "num", digits: 1 },
        { kind: "int" },
      ]),
    })),
    matches: games.filter((game) => game.type === "501").map(matchCard),
  };
}

type Bucket = {
  points: number;
  darts: number;
  legs: number;
  legacySum: number;
  legacyN: number;
  bestLeg: number | null;
  mprSum: number;
  mprN: number;
  scoreSum: number;
  scoreN: number;
  hitsSum: number;
  hitsN: number;
  pointsSum: number;
  pointsN: number;
  avgSum: number;
  avgN: number;
  bestVisit: number;
  bestTotal: number;
  oneEighty: number;
  winRoundSum: number;
  winRoundCount: number;
  fastestWin: number | null;
};

function emptyBucket(): Bucket {
  return {
    points: 0,
    darts: 0,
    legs: 0,
    legacySum: 0,
    legacyN: 0,
    bestLeg: null,
    mprSum: 0,
    mprN: 0,
    scoreSum: 0,
    scoreN: 0,
    hitsSum: 0,
    hitsN: 0,
    pointsSum: 0,
    pointsN: 0,
    avgSum: 0,
    avgN: 0,
    bestVisit: 0,
    bestTotal: 0,
    oneEighty: 0,
    winRoundSum: 0,
    winRoundCount: 0,
    fastestWin: null,
  };
}

function rank(
  players: TrainingPlayer[],
  games: SavedGame[],
  type: SavedGame["type"],
  take: (player: GamePlayerResult, row: Bucket) => void,
  finish: (row: Bucket) => { primary: number | null; extras: (number | null)[] } = finish501,
): Accum[] {
  const map = new Map<string, Bucket & { name: string; userId?: string; matches: number; wins: number }>();
  const ensure = (name: string, userId?: string) => {
    const key = normName(name);
    const row = map.get(key) ?? { ...emptyBucket(), name, userId, matches: 0, wins: 0 };
    if (userId && !row.userId) row.userId = userId;
    map.set(key, row);
    return row;
  };
  for (const person of players) ensure(person.name, person.userId);
  for (const game of games) {
    if (game.type !== type) continue;
    for (const player of game.players) {
      const row = ensure(player.name, player.userId);
      row.matches += 1;
      if (player.won) row.wins += 1;
      take(player, row);
    }
  }
  return [...map.values()]
    .map((row) => {
      const done = finish(row);
      return { name: row.name, userId: row.userId, matches: row.matches, wins: row.wins, primary: done.primary, extras: done.extras };
    })
    .sort(compareRank);
}

function finish501(row: Bucket): { primary: number | null; extras: (number | null)[] } {
  const average = row.darts > 0 ? (row.points / row.darts) * 3 : row.legacyN ? row.legacySum / row.legacyN : null;
  const perLeg = row.darts > 0 && row.legs > 0 ? row.darts / row.legs : null;
  return { primary: average, extras: [average, row.bestLeg, perLeg, row.oneEighty] };
}

function statCells(row: Accum, extras: { kind: "int" | "num"; digits?: number }[]): string[] {
  if (!row.matches) return Array(3 + extras.length).fill(DASH);
  const pct = (row.wins / row.matches) * 100;
  return [String(row.matches), String(row.wins), formatHr(pct, 0), ...extras.map((spec, index) => formatExtra(row.extras[index], spec))];
}

function formatExtra(value: number | null | undefined, spec: { kind: "int" | "num"; digits?: number }): string {
  if (value == null || Number.isNaN(value)) return DASH;
  if (spec.kind === "int") return String(Math.round(value));
  return formatHr(value, spec.digits ?? 1);
}

function compareRank(a: Accum, b: Accum): number {
  if (a.primary == null && b.primary != null) return 1;
  if (a.primary != null && b.primary == null) return -1;
  if (a.primary != null && b.primary != null && a.primary !== b.primary) return b.primary - a.primary;
  const aPct = a.matches ? a.wins / a.matches : -1;
  const bPct = b.matches ? b.wins / b.matches : -1;
  if (aPct !== bPct) return bPct - aPct;
  if (a.matches !== b.matches) return b.matches - a.matches;
  return a.name.localeCompare(b.name, "hr");
}

function boardCricket(players: TrainingPlayer[], games: SavedGame[]): TrainingBoard {
  const rows = rank(
    players,
    games,
    "cricket",
    (player, row) => {
      for (const round of player.winRounds ?? []) {
        row.winRoundSum += round;
        row.winRoundCount += 1;
        row.fastestWin = row.fastestWin == null ? round : Math.min(row.fastestWin, round);
      }
    },
    (row) => ({
      primary: row.winRoundCount ? row.winRoundSum / row.winRoundCount : null,
      extras: [row.winRoundCount ? row.winRoundSum / row.winRoundCount : null, row.fastestWin],
    }),
  ).sort(compareCricket);
  return {
    type: "cricket",
    title: "CRICKET",
    subtitle: "Utakmice, pobjede, prosječna ruka pobjede i najbrža pobjeda.",
    tab: "Cricket",
    columns: [
      { label: "M", hint: "Mečevi" },
      { label: "P", hint: "Pobjede" },
      { label: "%", hint: "Postotak pobjeda" },
      { label: "Prosj. ruka", hint: "Prosječna ruka pobjede" },
      { label: "Najbrža", hint: "Najbrža pobjeda" },
    ],
    rows: rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      userId: row.userId,
      values: statCells(row, [
        { kind: "num", digits: 1 },
        { kind: "int" },
      ]),
    })),
    matches: games.filter((game) => game.type === "cricket").map(matchCard),
  };
}

function compareCricket(a: Accum, b: Accum): number {
  const aPct = a.matches ? a.wins / a.matches : null;
  const bPct = b.matches ? b.wins / b.matches : null;
  if (aPct == null && bPct == null) return a.name.localeCompare(b.name, "hr");
  if (aPct == null) return 1;
  if (bPct == null) return -1;
  if (aPct !== bPct) return bPct - aPct;
  const aRound = a.extras[0];
  const bRound = b.extras[0];
  if (aRound == null && bRound != null) return 1;
  if (aRound != null && bRound == null) return -1;
  if (aRound != null && bRound != null && aRound !== bRound) return aRound - bRound;
  if (a.matches !== b.matches) return b.matches - a.matches;
  return a.name.localeCompare(b.name, "hr");
}

function boardMarathon(players: TrainingPlayer[], games: SavedGame[]): TrainingBoard {
  const rows = rank(
    players,
    games,
    "marathon",
    (player, row) => {
      if (player.totalScore != null) {
        row.hitsSum += player.totalScore;
        row.hitsN += 1;
      }
      if (player.marathonPoints != null) {
        row.pointsSum += player.marathonPoints;
        row.pointsN += 1;
      }
    },
    (row) => ({
      primary: row.hitsN ? row.hitsSum / row.hitsN : null,
      extras: [row.hitsN ? row.hitsSum / row.hitsN : null, row.pointsN ? row.pointsSum / row.pointsN : null],
    }),
  );
  return {
    type: "marathon",
    title: "MARATON",
    subtitle: "Utakmice, pobjede, prosjek pogodaka i bodova.",
    tab: "Maraton",
    columns: [
      { label: "M", hint: "Mečevi" },
      { label: "P", hint: "Pobjede" },
      { label: "%", hint: "Postotak pobjeda" },
      { label: "Pogoci", hint: "Prosjek pogodaka po meču" },
      { label: "Bodovi", hint: "Prosjek bodova po meču" },
    ],
    rows: rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      userId: row.userId,
      values: statCells(row, [
        { kind: "num", digits: 1 },
        { kind: "num", digits: 1 },
      ]),
    })),
    matches: games.filter((game) => game.type === "marathon").map(matchCard),
  };
}

function boardHighScore(players: TrainingPlayer[], games: SavedGame[]): TrainingBoard {
  const rows = rank(
    players,
    games,
    "highscore",
    (player, row) => {
      if (player.threeDartAvg) {
        row.avgSum += player.threeDartAvg;
        row.avgN += 1;
      }
      row.bestVisit = Math.max(row.bestVisit, player.highestVisit || 0);
      row.bestTotal = Math.max(row.bestTotal, player.totalScore || 0);
    },
    (row) => ({
      primary: row.avgN ? row.avgSum / row.avgN : null,
      extras: [row.avgN ? row.avgSum / row.avgN : null, row.bestVisit || null, row.bestTotal || null],
    }),
  );
  return {
    type: "highscore",
    title: "HIGH SCORE",
    subtitle: "Utakmice, pobjede, prosjek, najveći posjet i najbolji zbroj.",
    tab: "High",
    columns: [
      { label: "M", hint: "Mečevi" },
      { label: "P", hint: "Pobjede" },
      { label: "%", hint: "Postotak pobjeda" },
      { label: "Prosjek", hint: "Prosjek po rundi" },
      { label: "Najveći", hint: "Najveći posjet" },
      { label: "Zbroj", hint: "Najbolji zbroj" },
    ],
    rows: rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      userId: row.userId,
      values: statCells(row, [
        { kind: "num", digits: 2 },
        { kind: "int" },
        { kind: "int" },
      ]),
    })),
    matches: games.filter((game) => game.type === "highscore").map(matchCard),
  };
}

function matchCard(game: SavedGame): MatchCard {
  const legsKnown = game.players.length > 0 && game.players.every((player) => player.legsWon != null);
  const score = legsKnown ? game.players.map((player) => player.legsWon).join(":") : game.summary;
  return {
    id: game.id,
    playedAt: game.playedAt,
    score,
    players: game.players.map((player) => player.name).join(" – "),
    averages: averageLine(game),
    playersDetail: game.players.map((player) => ({
      name: player.name,
      won: player.won,
      lines: detailLines(game.type, player),
    })),
  };
}

function averageLine(game: SavedGame): string {
  if (game.type === "501") return game.players.map((player) => (player.threeDartAvg != null ? formatHr(player.threeDartAvg, 2) : DASH)).join(" · ");
  if (game.type === "cricket") {
    return game.players
      .map((player) => {
        if (player.winRounds?.length) {
          const average = player.winRounds.reduce((sum, round) => sum + round, 0) / player.winRounds.length;
          return `ruka ${formatHr(average, 1)}`;
        }
        return player.cricketMpr != null ? `MPR ${formatHr(player.cricketMpr, 2)}` : DASH;
      })
      .join(" · ");
  }
  if (game.type === "marathon") {
    return game.players
      .map((player) => `${player.totalScore ?? 0} pog.${player.marathonPoints != null ? ` / ${player.marathonPoints} bod` : ""}`)
      .join(" · ");
  }
  return game.players.map((player) => (player.threeDartAvg != null ? formatHr(player.threeDartAvg, 2) : DASH)).join(" · ");
}

function detailLines(type: SavedGame["type"], player: GamePlayerResult): MatchDetailLine[] {
  const lines: MatchDetailLine[] = [{ label: "Ishod", value: player.won ? "Pobjeda" : "Poraz" }];
  if (type === "501") {
    if (player.legsWon != null) lines.push({ label: "Legovi", value: String(player.legsWon) });
    if (player.threeDartAvg != null) lines.push({ label: "Prosjek", value: formatHr(player.threeDartAvg, 2) });
    if (player.bestLegDarts) lines.push({ label: "Najbolji leg", value: `${player.bestLegDarts} strelica` });
    if (player.checkout) lines.push({ label: "Checkout", value: player.checkout });
    if (player.dartsThrown && player.legsPlayed) lines.push({ label: "Str/leg", value: formatHr(player.dartsThrown / player.legsPlayed, 1) });
    if (player.count180 != null) lines.push({ label: "180", value: String(player.count180) });
  } else if (type === "cricket") {
    if (player.legsWon != null) lines.push({ label: "Legovi", value: String(player.legsWon) });
    if (player.winRounds?.length) {
      const average = player.winRounds.reduce((sum, round) => sum + round, 0) / player.winRounds.length;
      lines.push({ label: "Ruke pobjede", value: player.winRounds.join(", ") });
      lines.push({ label: "Prosječna ruka", value: formatHr(average, 1) });
      lines.push({ label: "Najbrža pobjeda", value: `${Math.min(...player.winRounds)}. ruka` });
    }
    if (player.cricketMpr != null) lines.push({ label: "MPR", value: formatHr(player.cricketMpr, 2) });
    if (player.totalScore != null) lines.push({ label: "Bodovi", value: String(player.totalScore) });
  } else if (type === "marathon") {
    if (player.totalScore != null) lines.push({ label: "Pogoci", value: String(player.totalScore) });
    if (player.marathonPoints != null) lines.push({ label: "Bodovi", value: String(player.marathonPoints) });
  } else {
    if (player.threeDartAvg != null) lines.push({ label: "Prosjek", value: formatHr(player.threeDartAvg, 2) });
    if (player.totalScore != null) lines.push({ label: "Zbroj", value: String(player.totalScore) });
    if (player.highestVisit) lines.push({ label: "Najveći posjet", value: String(player.highestVisit) });
  }
  return lines;
}
