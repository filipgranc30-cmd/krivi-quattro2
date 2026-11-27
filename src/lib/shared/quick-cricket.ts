import type { GamePlayerResult } from "./types";
import { firstTo } from "./quick501";

export type CricketPlayer = { key: string; name: string; userId?: string };

export type CricketLeg = {
  winnerIndex: number;
  round: number;
};

export function parseCricketLeg(input: { winnerIndex: number; round: number; playerCount: number }): { ok: true; leg: CricketLeg } | { ok: false; error: string } {
  if (input.playerCount < 2) return { ok: false, error: "Odaberi barem dva igrača." };
  if (!Number.isInteger(input.winnerIndex) || input.winnerIndex < 0 || input.winnerIndex >= input.playerCount) {
    return { ok: false, error: "Odaberi pobjednika lega." };
  }
  if (!Number.isInteger(input.round) || input.round < 1 || input.round > 40) {
    return { ok: false, error: "Ruka je broj od 1 naviše." };
  }
  return { ok: true, leg: { winnerIndex: input.winnerIndex, round: input.round } };
}

export type CricketSummary = {
  legsWon: number;
  rounds: number[];
  averageRound: number | null;
  fastest: number | null;
};

export function summarizeCricket(playerCount: number, legs: CricketLeg[]): CricketSummary[] {
  return Array.from({ length: playerCount }, (_, index) => {
    const rounds = legs.filter((leg) => leg.winnerIndex === index).map((leg) => leg.round);
    const averageRound = rounds.length ? rounds.reduce((sum, round) => sum + round, 0) / rounds.length : null;
    return {
      legsWon: rounds.length,
      rounds,
      averageRound,
      fastest: rounds.length ? Math.min(...rounds) : null,
    };
  });
}

export function cricketTarget(bestOf: number): number {
  return firstTo(bestOf);
}

export function toCricketPlayers(players: CricketPlayer[], summaries: CricketSummary[], targetLegs: number): GamePlayerResult[] {
  return players.map((player, index) => {
    const summary = summaries[index];
    return {
      name: player.name,
      userId: player.userId,
      won: summary.legsWon >= targetLegs,
      legsWon: summary.legsWon,
      legsPlayed: summaries.reduce((sum, item) => sum + item.legsWon, 0),
      winRounds: summary.rounds,
    };
  });
}
