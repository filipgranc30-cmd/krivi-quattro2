export const MARATHON_ROUNDS = 20;

export type MarathonTarget = { label: string; points: number };

/** Bull first, then D20 down to D1. Bull and double-bull are the same target. */
export const MARATHON_TARGETS: MarathonTarget[] = [
  { label: "BULL", points: 50 },
  ...Array.from({ length: 20 }, (_, index) => {
    const number = 20 - index;
    return { label: `D${number}`, points: number * 2 };
  }),
];

export type MarathonPlayer = {
  key: string;
  name: string;
  userId?: string;
  target: number;
  hits: number;
  points: number;
  rounds: number;
  bestRound: number;
  finished: boolean;
};

export type MarathonState = {
  players: MarathonPlayer[];
  turn: number;
  dart: number;
  roundPoints: number;
  over: boolean;
};

export function createMarathon(players: { key: string; name: string; userId?: string }[]): MarathonState {
  return {
    players: players.map((player) => ({
      key: player.key,
      name: player.name,
      userId: player.userId,
      target: 0,
      hits: 0,
      points: 0,
      rounds: 0,
      bestRound: 0,
      finished: false,
    })),
    turn: 0,
    dart: 0,
    roundPoints: 0,
    over: false,
  };
}

function clone(state: MarathonState): MarathonState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
  };
}

/** One dart. A hit scores the current target and moves to the next one immediately. */
export function throwMarathonDart(state: MarathonState, hit: boolean): MarathonState {
  if (state.over || state.players.length === 0) return state;
  const next = clone(state);
  const player = next.players[next.turn];
  if (!player || player.finished || player.rounds >= MARATHON_ROUNDS) return state;

  let finishedNow = false;
  if (hit) {
    const target = MARATHON_TARGETS[player.target];
    player.hits += 1;
    player.points += target.points;
    next.roundPoints += target.points;
    if (player.target >= MARATHON_TARGETS.length - 1) {
      player.finished = true;
      finishedNow = true;
    } else {
      player.target += 1;
    }
  }

  next.dart += 1;
  const roundOver = next.dart >= 3 || finishedNow;
  if (roundOver) {
    player.rounds += 1;
    player.bestRound = Math.max(player.bestRound, next.roundPoints);
    next.dart = 0;
    next.roundPoints = 0;
  }

  const everyoneDone = next.players.every((item) => item.finished || item.rounds >= MARATHON_ROUNDS);
  if (finishedNow || (roundOver && everyoneDone)) {
    next.over = true;
    return next;
  }

  if (roundOver) {
    const after = next.players.findIndex((item, index) => index > next.turn && !item.finished && item.rounds < MARATHON_ROUNDS);
    const wrapped = next.players.findIndex((item) => !item.finished && item.rounds < MARATHON_ROUNDS);
    next.turn = after >= 0 ? after : Math.max(0, wrapped);
  }
  return next;
}

export function marathonWinner(state: MarathonState): number {
  return state.players.reduce((best, player, index, all) => {
    if (player.hits > all[best].hits) return index;
    if (player.hits === all[best].hits && player.points > all[best].points) return index;
    return best;
  }, 0);
}
