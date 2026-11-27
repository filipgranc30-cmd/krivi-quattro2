import type { GamePlayerResult } from "./types";

export type QuickPlayer = { key: string; name: string; userId?: string };

export type QuickLegInput = {
  winnerIndex: number;
  round: number;
  dart: number;
  loserRemaining: number;
  starterIndex: number;
  playerCount: number;
};

export type QuickLeg = {
  winnerIndex: number;
  loserIndex: number;
  starterIndex: number;
  round: number;
  dart: number;
  loserRemaining: number;
  winnerDarts: number;
  loserDarts: number;
  winnerPoints: number;
  loserPoints: number;
  winnerAvg: number;
  loserAvg: number;
  /** 180s in this leg, one count per player, same order as the match. */
  oneEighties: number[];
};

export type QuickPlayerSummary = {
  legsWon: number;
  legsPlayed: number;
  darts: number;
  points: number;
  average: number;
  bestLegDarts: number | null;
  checkout: string | null;
  count180: number;
};

export function firstTo(bestOf: number): number {
  const legs = Math.max(1, Math.floor(bestOf));
  return Math.ceil(legs / 2);
}

export function starterForLeg(openingStarter: number, legIndex: number, playerCount = 2): number {
  const count = Math.max(1, playerCount);
  return (openingStarter + legIndex) % count;
}

export function winnerDarts(round: number, dart: number): number {
  return (round - 1) * 3 + dart;
}

export function loserDarts(round: number, loserStarted: boolean): number {
  return loserStarted ? round * 3 : Math.max(0, (round - 1) * 3);
}

export function threeDartAverage(points: number, darts: number): number {
  if (darts <= 0 || points <= 0) return 0;
  return (points / darts) * 3;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function checkoutLabel(round: number, dart: number): string {
  return `${round}. ruka, ${dart}. strelica`;
}

export function parseQuickLeg(input: QuickLegInput): { ok: true; leg: QuickLeg } | { ok: false; error: string } {
  const count = input.playerCount;
  if (count < 2) return { ok: false, error: "Odaberi dva igrača." };
  if (!Number.isInteger(input.winnerIndex) || input.winnerIndex < 0 || input.winnerIndex >= count) {
    return { ok: false, error: "Odaberi pobjednika lega." };
  }
  if (!Number.isInteger(input.round) || input.round < 1 || input.round > 40) {
    return { ok: false, error: "Ruka je broj od 1 naviše." };
  }
  if (input.dart !== 1 && input.dart !== 2 && input.dart !== 3) {
    return { ok: false, error: "Završna strelica je 1, 2 ili 3." };
  }
  if (!Number.isInteger(input.loserRemaining) || input.loserRemaining < 2 || input.loserRemaining > 501) {
    return { ok: false, error: "Ostatak gubitnika je cijeli broj od 2 do 501." };
  }
  const loserIndex = input.winnerIndex === 0 ? 1 : 0;
  const thrown = winnerDarts(input.round, input.dart);
  const loserStarted = input.starterIndex === loserIndex;
  const against = loserDarts(input.round, loserStarted);
  const winnerPoints = 501;
  const loserPoints = against === 0 ? 0 : 501 - input.loserRemaining;
  return {
    ok: true,
    leg: {
      winnerIndex: input.winnerIndex,
      loserIndex,
      starterIndex: input.starterIndex,
      round: input.round,
      dart: input.dart,
      loserRemaining: input.loserRemaining,
      winnerDarts: thrown,
      loserDarts: against,
      winnerPoints,
      loserPoints,
      winnerAvg: round1(threeDartAverage(winnerPoints, thrown)),
      loserAvg: round1(threeDartAverage(loserPoints, against)),
      oneEighties: [],
    },
  };
}

export function summarizeQuickMatch(playerCount: number, legs: QuickLeg[]): QuickPlayerSummary[] {
  return Array.from({ length: playerCount }, (_, index) => {
    const won = legs.filter((leg) => leg.winnerIndex === index);
    const darts = legs.reduce((sum, leg) => sum + (leg.winnerIndex === index ? leg.winnerDarts : leg.loserIndex === index ? leg.loserDarts : 0), 0);
    const points = legs.reduce((sum, leg) => sum + (leg.winnerIndex === index ? leg.winnerPoints : leg.loserIndex === index ? leg.loserPoints : 0), 0);
    const best = won.reduce<QuickLeg | null>((chosen, leg) => (!chosen || leg.winnerDarts < chosen.winnerDarts ? leg : chosen), null);
    return {
      legsWon: won.length,
      legsPlayed: legs.length,
      darts,
      points,
      average: round1(threeDartAverage(points, darts)),
      bestLegDarts: best ? best.winnerDarts : null,
      checkout: best ? checkoutLabel(best.round, best.dart) : null,
      count180: legs.reduce((sum, leg) => sum + (leg.oneEighties?.[index] || 0), 0),
    };
  });
}

export function toSavedPlayers(players: QuickPlayer[], summaries: QuickPlayerSummary[], targetLegs: number): GamePlayerResult[] {
  return players.map((player, index) => {
    const summary = summaries[index];
    return {
      name: player.name,
      userId: player.userId,
      won: summary.legsWon >= targetLegs,
      threeDartAvg: summary.average,
      legsWon: summary.legsWon,
      legsPlayed: summary.legsPlayed,
      dartsThrown: summary.darts,
      pointsScored: summary.points,
      bestLegDarts: summary.bestLegDarts ?? undefined,
      checkout: summary.checkout ?? undefined,
      count180: summary.count180,
    };
  });
}

export type FiveOhOneRow = {
  name: string;
  matches: number;
  wins: number;
  average: number | null;
  bestLegDarts: number | null;
  dartsPerLeg: number | null;
};

export function aggregate501(games: { type: string; players: GamePlayerResult[] }[]): FiveOhOneRow[] {
  const map = new Map<string, FiveOhOneRow & { points: number; darts: number; legs: number; legacySum: number; legacyN: number }>();
  for (const game of games) {
    if (game.type !== "501") continue;
    for (const player of game.players) {
      const key = player.name.toLocaleLowerCase("hr");
      const row = map.get(key) ?? {
        name: player.name,
        matches: 0,
        wins: 0,
        average: null,
        bestLegDarts: null,
        dartsPerLeg: null,
        points: 0,
        darts: 0,
        legs: 0,
        legacySum: 0,
        legacyN: 0,
      };
      row.matches += 1;
      if (player.won) row.wins += 1;
      if (player.dartsThrown && player.dartsThrown > 0) {
        row.darts += player.dartsThrown;
        row.points += player.pointsScored || 0;
        row.legs += player.legsPlayed || 0;
      } else if (player.threeDartAvg) {
        row.legacySum += player.threeDartAvg;
        row.legacyN += 1;
      }
      if (player.bestLegDarts && (row.bestLegDarts == null || player.bestLegDarts < row.bestLegDarts)) {
        row.bestLegDarts = player.bestLegDarts;
      }
      map.set(key, row);
    }
  }
  return [...map.values()]
    .map((row) => ({
      name: row.name,
      matches: row.matches,
      wins: row.wins,
      average: row.darts > 0 ? round1(threeDartAverage(row.points, row.darts)) : row.legacyN ? round1(row.legacySum / row.legacyN) : null,
      bestLegDarts: row.bestLegDarts,
      dartsPerLeg: row.darts > 0 && row.legs > 0 ? round1(row.darts / row.legs) : null,
    }))
    .sort((a, b) => b.wins - a.wins || (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name, "hr"));
}
