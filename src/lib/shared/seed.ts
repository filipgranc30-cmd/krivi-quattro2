import { CLUB_NAME, DEFAULT_TRAINING_TIME, HOME_VENUE } from "./club";
import type { Db, OpponentScout, RosterPlayer, Settings } from "./types";
import { uid } from "./util";

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
  ];
  const demo: RosterPlayer[] = [
    { id: uid(), name: "Marko Horvat", nickname: "The Butcher", average: 31.47, demo: true },
    { id: uid(), name: "Ivan Kovač", nickname: "Ice", average: 29.81, demo: true },
    { id: uid(), name: "Luka Perić", nickname: "Silent", average: 28.66, demo: true },
    { id: uid(), name: "Matej Matić", nickname: "Mace", average: 27.35, demo: true },
    { id: uid(), name: "Tomislav Sertić", nickname: "Toti", average: 26.18, demo: true },
    { id: uid(), name: "Dario Jurić", nickname: "Daro", average: 25.42, demo: true },
  ];
  return [
    ...real.map((name) => ({ id: uid(), name, nickname: "", average: null, demo: false })),
    ...demo,
  ];
}

export function seedScouts(): OpponentScout[] {
  return [
    {
      club: "BULL BUZIN",
      demo: true,
      players: [
        { name: "Ante Horvat", nickname: "Bull", average: 29.4 },
        { name: "Petar Babić", nickname: "Pika", average: 27.15 },
        { name: "Ivan Novak", nickname: "Nova", average: 25.8 },
        { name: "Luka Barić", nickname: "Lux", average: 24.22 },
        { name: "Mario Kovač", nickname: "Make", average: 22.9 },
      ],
    },
  ];
}

export function emptyDb(): Db {
  return {
    users: [],
    sessions: [],
    attendance: [],
    notifications: [],
    manualFixtures: [],
    roster: seedRoster(),
    opponentScouts: seedScouts(),
    games: [],
    settings: defaultSettings(),
    pushSubs: [],
  };
}

export const DEMO_NEXT = {
  opponent: "BULL BUZIN",
  venue: "Darts Pub Buzin",
  datetime: "2026-12-12T18:00:00.000Z",
  home: false,
  round: "Demo",
};
