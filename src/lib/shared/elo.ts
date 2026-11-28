import type { EloChallenge, EloState, SavedGame } from "./types";

export const DEFAULT_ELO = 1000;

export type EloMember = { id: string; name: string };

export type EloStanding = {
  userId: string;
  name: string;
  rating: number;
  trend: number;
  matches: number;
  wins: number;
  losses: number;
};

export type EloEvent = {
  id: string;
  at: string;
  source: "challenge" | "training";
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  aWon: boolean;
  format: string;
  legs: string;
  deltaA: number;
  deltaB: number;
  ratingA: number;
  ratingB: number;
};

export type EloBoard = {
  startRating: number;
  trainingCounts: boolean;
  standings: EloStanding[];
  events: EloEvent[];
  countedGameIds: string[];
};

export function emptyElo(): EloState {
  return { startRating: DEFAULT_ELO, trainingCounts: true, challenges: [] };
}

export function normalizeElo(elo?: Partial<EloState> | null): EloState {
  const start = Number(elo?.startRating);
  return {
    startRating: Number.isFinite(start) ? Math.max(100, Math.min(3000, Math.round(start))) : DEFAULT_ELO,
    trainingCounts: elo?.trainingCounts !== false,
    challenges: Array.isArray(elo?.challenges) ? elo.challenges : [],
  };
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function eloDelta(ratingA: number, ratingB: number, matchesA: number, matchesB: number, aWon: boolean): number {
  const score = aWon ? 1 : 0;
  const expected = expectedScore(ratingA, ratingB);
  const kA = matchesA < 10 ? 40 : 32;
  const kB = matchesB < 10 ? 40 : 32;
  const rawA = kA * (score - expected);
  const rawB = kB * (expected - score);
  return Math.round((rawA - rawB) / 2);
}

export function buildClubElo(input: { games: SavedGame[]; elo?: Partial<EloState> | null; members: EloMember[] }): EloBoard {
  const elo = normalizeElo(input.elo);
  const names = new Map(input.members.map((member) => [member.id, member.name]));
  const nameOf = (id: string, fallback: string) => names.get(id) || fallback;
  const events: Omit<EloEvent, "deltaA" | "deltaB" | "ratingA" | "ratingB">[] = [];
  const challengeDays = new Set<string>();

  for (const challenge of elo.challenges) {
    if (challenge.status !== "confirmed") continue;
    const legsA = challenge.legsChallenger ?? 0;
    const legsB = challenge.legsOpponent ?? 0;
    if (legsA === legsB) continue;
    const at = challenge.date ? `${challenge.date}T12:00:00.000Z` : challenge.confirmedAt || challenge.createdAt;
    events.push({
      id: challenge.id,
      at,
      source: "challenge",
      aId: challenge.challengerId,
      aName: nameOf(challenge.challengerId, challenge.challengerName),
      bId: challenge.opponentId,
      bName: nameOf(challenge.opponentId, challenge.opponentName),
      aWon: legsA > legsB,
      format: challenge.format,
      legs: `${legsA}:${legsB}`,
    });
    challengeDays.add(pairDay(challenge.challengerId, challenge.opponentId, at.slice(0, 10)));
  }

  if (elo.trainingCounts) {
    for (const game of input.games) {
      const pair = trainingPair(game);
      if (!pair) continue;
      const day = (game.playedAt || "").slice(0, 10);
      if (challengeDays.has(pairDay(pair.aId, pair.bId, day))) continue;
      events.push({
        id: game.id,
        at: game.playedAt,
        source: "training",
        aId: pair.aId,
        aName: nameOf(pair.aId, pair.aName),
        bId: pair.bId,
        bName: nameOf(pair.bId, pair.bName),
        aWon: pair.aWon,
        format: formatOf(game.type),
        legs: pair.legs,
      });
    }
  }

  events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  const rating = new Map<string, number>();
  const played = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const trend = new Map<string, number>();
  for (const member of input.members) rating.set(member.id, elo.startRating);

  const rated: EloEvent[] = events.map((event) => {
    const beforeA = rating.get(event.aId) ?? elo.startRating;
    const beforeB = rating.get(event.bId) ?? elo.startRating;
    const delta = eloDelta(beforeA, beforeB, played.get(event.aId) ?? 0, played.get(event.bId) ?? 0, event.aWon);
    const ratingA = beforeA + delta;
    const ratingB = beforeB - delta;
    rating.set(event.aId, ratingA);
    rating.set(event.bId, ratingB);
    played.set(event.aId, (played.get(event.aId) ?? 0) + 1);
    played.set(event.bId, (played.get(event.bId) ?? 0) + 1);
    wins.set(event.aId, (wins.get(event.aId) ?? 0) + (event.aWon ? 1 : 0));
    wins.set(event.bId, (wins.get(event.bId) ?? 0) + (event.aWon ? 0 : 1));
    losses.set(event.aId, (losses.get(event.aId) ?? 0) + (event.aWon ? 0 : 1));
    losses.set(event.bId, (losses.get(event.bId) ?? 0) + (event.aWon ? 1 : 0));
    trend.set(event.aId, delta);
    trend.set(event.bId, -delta);
    return { ...event, deltaA: delta, deltaB: -delta, ratingA, ratingB };
  });

  const standings = input.members
    .map((member) => ({
      userId: member.id,
      name: member.name,
      rating: rating.get(member.id) ?? elo.startRating,
      trend: trend.get(member.id) ?? 0,
      matches: played.get(member.id) ?? 0,
      wins: wins.get(member.id) ?? 0,
      losses: losses.get(member.id) ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "hr"));

  return {
    startRating: elo.startRating,
    trainingCounts: elo.trainingCounts,
    standings,
    events: rated,
    countedGameIds: rated.filter((event) => event.source === "training").map((event) => event.id),
  };
}

export function markCountedGames(games: SavedGame[], countedIds: string[]) {
  const counted = new Set(countedIds);
  for (const game of games) game.eloCounted = counted.has(game.id);
}

function trainingPair(game: SavedGame): { aId: string; aName: string; bId: string; bName: string; aWon: boolean; legs: string } | null {
  if (game.eloExclude || game.players.length !== 2) return null;
  const [first, second] = game.players;
  if (!first?.userId || !second?.userId || first.userId === second.userId) return null;
  if (first.won === second.won) return null;
  const legs = first.legsWon != null && second.legsWon != null ? `${first.legsWon}:${second.legsWon}` : "";
  return { aId: first.userId, aName: first.name, bId: second.userId, bName: second.name, aWon: first.won, legs };
}

function pairDay(a: string, b: string, day: string) {
  return `${[a, b].sort().join(":")}:${day}`;
}

function formatOf(type: SavedGame["type"]) {
  if (type === "501") return "501 trening";
  if (type === "cricket") return "Cricket trening";
  if (type === "marathon") return "Maraton trening";
  return "High score trening";
}

export function challengeStatusLabel(status: EloChallenge["status"]) {
  if (status === "pending") return "Čeka odgovor";
  if (status === "accepted") return "Prihvaćen";
  if (status === "declined") return "Odbijen";
  if (status === "reported") return "Čeka potvrdu";
  if (status === "confirmed") return "Potvrđen";
  return "Poništen";
}
