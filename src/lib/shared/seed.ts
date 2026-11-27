import { defaultDailyDarts } from "./daily-darts";
import { CLUB_NAME, DEFAULT_TRAINING_TIME, HOME_VENUE } from "./club";
import type { Db, RosterPlayer, Settings } from "./types";
import { normName, uid } from "./util";

export const DEFAULT_TRAINING_PLAYER = "Karlo Sedmak";

export function defaultSettings(): Settings {
  return {
    clubName: CLUB_NAME,
    trainingTime: DEFAULT_TRAINING_TIME,
    venue: HOME_VENUE,
    leagueOverride: null,
    nextOverride: null,
    useManualSchedule: false,
  };
}

export function seedRoster(): RosterPlayer[] {
  const real = [
    "Filip Granc",
    "Marko Matota",
    "Vjekoslav Kos",
    "Vladimir Kos",
    "Gani Hoti",
    "Ivan Jelinčić",
    "Danijel Jelinčić",
    "Zvonimir Soltar",
    DEFAULT_TRAINING_PLAYER,
  ];
  return real.map((name) => ({ id: uid(), name, nickname: "", average: null, demo: false }));
}

export function stripDemoData(db: Db): { db: Db; changed: boolean } {
  const demoNames = new Set(db.roster.filter((player) => player.demo).map((player) => normName(player.name)));
  const roster = db.roster.filter((player) => !player.demo);
  const hasKarlo = roster.some((player) => normName(player.name) === normName(DEFAULT_TRAINING_PLAYER));
  if (!hasKarlo) {
    roster.push({ id: uid(), name: DEFAULT_TRAINING_PLAYER, nickname: "", average: null, demo: false });
  }
  const opponentScouts = db.opponentScouts.filter((scout) => !scout.demo);
  const games = db.games
    .map((game) => ({
      ...game,
      players: game.players.filter((player) => !demoNames.has(normName(player.name))),
    }))
    .filter((game) => game.players.length > 0);
  const changed =
    roster.length !== db.roster.length ||
    !hasKarlo ||
    opponentScouts.length !== db.opponentScouts.length ||
    games.length !== db.games.length ||
    games.some((game, index) => game.players.length !== db.games[index]?.players.length);
  if (!changed) return { db, changed: false };
  return { db: { ...db, roster, opponentScouts, games }, changed: true };
}

export function emptyDb(): Db {
  return {
    users: [],
    sessions: [],
    attendance: [],
    notifications: [],
    manualFixtures: [],
    roster: seedRoster(),
    opponentScouts: [],
    games: [],
    settings: defaultSettings(),
    pushSubs: [],
    dailyDarts: defaultDailyDarts(),
  };
}

export const DEMO_NEXT = {
  opponent: "BULL BUZIN",
  venue: "Darts Pub Buzin",
  datetime: "2026-12-12T18:00:00.000Z",
  home: false,
  round: "Demo",
};
