export type Role = "admin" | "member";

/** Missing status on older accounts means active. */
export type AccountStatus = "pending" | "active";

export type UserPublic = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
};

export function accountStatus(user: { status?: AccountStatus | null }): AccountStatus {
  return user.status === "pending" ? "pending" : "active";
}

export type AttendanceStatus = "dolazim" | "ne_dolazim" | "mozda";

export type Attendance = {
  id: string;
  kind: "match" | "training";
  targetId: string;
  userId: string;
  userName: string;
  status: AttendanceStatus;
  updatedAt: string;
};

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export type ManualFixture = {
  id: string;
  opponent: string;
  venue: string;
  datetime: string;
  home: boolean;
  league: string;
  round: string;
  scoreUs: number | null;
  scoreThem: number | null;
};

export type NextOverride = {
  opponent: string;
  venue: string;
  datetime: string;
  home: boolean;
  round: string;
} | null;

export type LeagueOverride = {
  name: string;
  position: number;
  points: number | null;
} | null;

export type RosterPlayer = {
  id: string;
  name: string;
  nickname: string;
  average: number | null;
  demo: boolean;
};

export type ScoutPlayer = {
  name: string;
  nickname: string;
  average: number;
};

export type OpponentScout = {
  club: string;
  demo: boolean;
  players: ScoutPlayer[];
};

export type GamePlayerResult = {
  name: string;
  userId?: string;
  won: boolean;
  threeDartAvg?: number;
  first9?: number;
  checkoutPct?: number;
  highestVisit?: number;
  count180?: number;
  count140?: number;
  count100?: number;
  bestCheckout?: number;
  cricketMpr?: number;
  totalScore?: number;
  /** Marathon only: total points (bull 50, double × 2). Hits stay in totalScore. */
  marathonPoints?: number;
  /** 501: legs won in this match. */
  legsWon?: number;
  /** 501: legs contested in this match. */
  legsPlayed?: number;
  /** 501: darts thrown in this match. */
  dartsThrown?: number;
  /** 501: points scored. A won leg is 501; a lost leg is 501 minus the remaining score. */
  pointsScored?: number;
  /** 501: fewest darts in a leg this player won. */
  bestLegDarts?: number;
  /** 501: checkout of the best leg, for example "5. ruka, 3. strelica". */
  checkout?: string;
  /** Cricket quick entry: the round (ruka) of each leg this player won. */
  winRounds?: number[];
};

export type SavedGame = {
  id: string;
  type: "501" | "cricket" | "marathon" | "highscore";
  playedAt: string;
  summary: string;
  players: GamePlayerResult[];
};

export type Settings = {
  clubName: string;
  trainingTime: string;
  venue: string;
  leagueOverride: LeagueOverride;
  nextOverride: NextOverride;
  useManualSchedule: boolean;
};

export type PushSub = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type Member = {
  id: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  email: string;
};

export type AppData = {
  attendance: Attendance[];
  notifications: NotificationItem[];
  manualFixtures: ManualFixture[];
  roster: RosterPlayer[];
  opponentScouts: OpponentScout[];
  games: SavedGame[];
  settings: Settings;
  members: Member[];
  pendingRequests: Member[];
};

export type StoredUser = UserPublic & { passwordHash: string };

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type Db = {
  users: StoredUser[];
  sessions: Session[];
  attendance: Attendance[];
  notifications: NotificationItem[];
  manualFixtures: ManualFixture[];
  roster: RosterPlayer[];
  opponentScouts: OpponentScout[];
  games: SavedGame[];
  settings: Settings;
  pushSubs: PushSub[];
};

export type Action =
  | {
      op: "attendance";
      kind: "match" | "training";
      targetId: string;
      status: AttendanceStatus;
      label: string;
    }
  | { op: "clearAttendance"; kind: "match" | "training"; targetId: string }
  | { op: "readNotifications" }
  | { op: "addFixture"; fixture: Omit<ManualFixture, "id"> }
  | { op: "updateFixture"; fixture: ManualFixture }
  | { op: "deleteFixture"; id: string }
  | { op: "setSettings"; settings: Settings }
  | { op: "upsertRoster"; player: Omit<RosterPlayer, "id"> & { id?: string } }
  | { op: "deleteRoster"; id: string }
  | { op: "setScout"; scout: OpponentScout }
  | { op: "deleteScout"; club: string }
  | { op: "saveGame"; game: Omit<SavedGame, "id"> }
  | { op: "deleteGame"; id: string }
  | { op: "setRole"; userId: string; role: Role }
  | { op: "approveUser"; userId: string }
  | { op: "rejectUser"; userId: string };

export type LeagueInfo = { id: number; name: string; group: string };

export type StandingRow = {
  position: number;
  crewId: string;
  name: string;
  points: number;
  played: number;
  won: number;
  draw: string;
  lost: number;
  legs: string;
  sets: string;
};

export type FixtureRow = {
  round: string;
  datetime: string;
  dateLabel: string;
  home: string;
  away: string;
  homeSlug: string;
  awaySlug: string;
  scoreHome: number | null;
  scoreAway: number | null;
  eventPath: string;
  played: boolean;
};

export type LeaguePlayer = {
  rank: string;
  playerId: string;
  name: string;
  club: string;
  points: number;
  winPct: number;
  played: number;
  wl: string;
  legs: string;
};

export type LeagueBundle = {
  id: number;
  name: string;
  season: string;
  sourceUrl: string;
  fetchedAt: string;
  standings: StandingRow[];
  fixtures: FixtureRow[];
  players: LeaguePlayer[];
};

export type SnapshotFixture = {
  key: string;
  round: string;
  datetime: string;
  opponent: string;
  home: boolean;
  venue: string;
  eventUrl: string;
  scoreUs: number | null;
  scoreThem: number | null;
  played: boolean;
  source: "psgz" | "manual" | "override";
};

export type Snapshot = {
  leagueId: number;
  leagueName: string;
  season: string;
  sourceUrl: string;
  fetchedAt: string;
  position: number | null;
  points: number | null;
  played: number | null;
  ourPlayers: LeaguePlayer[];
  fixtures: SnapshotFixture[];
  next: SnapshotFixture | null;
  opponentPlayers: LeaguePlayer[];
  standings: StandingRow[];
};
