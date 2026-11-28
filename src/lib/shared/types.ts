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
  /** High score only. The JPEG lives in Redis at hs:proof:{id}, not on this row. */
  hasProof?: boolean;
  proofUserId?: string;
  proofRev?: number;
  /** This training game is part of the current ELO table. */
  eloCounted?: boolean;
  /** Admin removed this training game from ELO. */
  eloExclude?: boolean;
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

export type DailyDartsScoring = {
  win: number;
  averageBase: number;
  averagePoint: number;
  oneEighty: number;
  oneForty: number;
  oneHundred: number;
  checkoutPercentStep: number;
  checkoutPercentPoint: number;
  checkoutOver100: number;
  highest100: number;
  highest150: number;
  highest170: number;
};

export type DailyDartsPlayer = { id: string; name: string; externalId?: string };

export type DailyDartsDay = { id: string; date: string; lockTime: string; lockOverridden?: boolean };

export type DailyDartsMatch = {
  id: string;
  dayId: string;
  playerAId: string;
  playerBId: string;
  round: string;
  startTime: string;
  /** PDC fixture id when the match was imported. */
  externalId?: string;
  source?: "pdc" | "manual";
  tournamentId?: string;
  tournamentName?: string;
};

export type DailyDartsStat = {
  matchId: string;
  playerId: string;
  won: boolean;
  average: number;
  count180: number;
  count140: number;
  count100: number;
  checkoutHits: number;
  checkoutAttempts: number;
  checkoutOver100: number;
  highestCheckout: number;
};

export type DailyDartsPick = {
  id: string;
  dayId: string;
  userId: string;
  userName: string;
  playerIds: string[];
  updatedAt: string;
};

export type DailyDartsState = {
  players: DailyDartsPlayer[];
  days: DailyDartsDay[];
  matches: DailyDartsMatch[];
  stats: DailyDartsStat[];
  picks: DailyDartsPick[];
  scoring: DailyDartsScoring;
  reminderSent: string[];
  /** @deprecated use tournamentIds */
  tournamentId?: string;
  tournamentIds?: string[];
  lastSyncAt?: string;
  lastSyncMessage?: string;
};

export type PublicDailyDarts = {
  scoring: DailyDartsScoring;
  players: DailyDartsPlayer[];
  days: DailyDartsDay[];
  matches: DailyDartsMatch[];
  stats: DailyDartsStat[];
  myPicks: DailyDartsPick[];
  revealedPicks: DailyDartsPick[];
  pickCounts: { dayId: string; count: number }[];
  tournamentIds: string[];
  lastSyncAt: string;
  lastSyncMessage: string;
};

export type Member = {
  id: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  email: string;
  honorary?: boolean;
};

export type LedgerCategory = "renta" | "racun" | "stash" | "korekcija" | "kotizacija" | "liga" | "oprema" | "pice" | "ostalo";
export type MoneyAccount = "cash" | "bank";
export type DueKind = "renta" | "racun";

export type DuePayment = {
  userId: string;
  month: string;
  kind: DueKind;
  paidAt: string;
  enteredById: string;
  enteredByName: string;
};

export type LedgerEntry = {
  id: string;
  date: string;
  amount: number;
  direction: "income" | "expense";
  account: MoneyAccount;
  category: LedgerCategory;
  description: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  hasReceipt?: boolean;
  receiptUserId?: string;
  receiptRev?: number;
  source?: "dues" | "stash" | "balance" | "manual";
  dueUserId?: string;
  dueMonth?: string;
  dueKind?: DueKind;
  donorUserId?: string;
  donorName?: string;
};

export type EloChallengeStatus = "pending" | "accepted" | "declined" | "reported" | "confirmed" | "void";

export type EloChallenge = {
  id: string;
  createdAt: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  format: string;
  date: string;
  status: EloChallengeStatus;
  legsChallenger?: number;
  legsOpponent?: number;
  reportedById?: string;
  reportedAt?: string;
  confirmedById?: string;
  confirmedAt?: string;
};

export type EloState = {
  startRating: number;
  trainingCounts: boolean;
  challenges: EloChallenge[];
};

export type Treasury = {
  rentaAmount: number;
  bankAmount: number;
  iban: string;
  dues: DuePayment[];
  entries: LedgerEntry[];
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
  dailyDarts: PublicDailyDarts;
  treasury: Treasury;
  elo: EloState;
};

export type StoredUser = UserPublic & { passwordHash: string; honorary?: boolean };

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
  dailyDarts: DailyDartsState;
  treasury: Treasury;
  elo: EloState;
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
  | { op: "saveGame"; game: Omit<SavedGame, "id" | "hasProof" | "proofUserId" | "proofRev"> & { id?: string } }
  | { op: "deleteGame"; id: string }
  | { op: "setGameProof"; id: string; hasProof: boolean }
  | { op: "setDueAmounts"; renta: number; bank: number }
  | { op: "setIban"; iban: string }
  | { op: "setHonorary"; userId: string; honorary: boolean }
  | { op: "toggleDue"; userId: string; month: string; kind: DueKind }
  | { op: "addStash"; id?: string; date: string; amount: number; donorUserId?: string }
  | { op: "setBalance"; account: MoneyAccount; amount: number }
  | { op: "addLedger"; entry: Omit<LedgerEntry, "createdById" | "createdByName" | "createdAt" | "hasReceipt" | "receiptUserId" | "receiptRev" | "source" | "dueUserId" | "dueMonth" | "dueKind" | "donorUserId" | "donorName"> & { id?: string } }
  | { op: "updateLedger"; entry: Pick<LedgerEntry, "id" | "date" | "amount" | "direction" | "account" | "category" | "description"> }
  | { op: "deleteLedger"; id: string }
  | { op: "setLedgerReceipt"; id: string; hasReceipt: boolean }
  | { op: "setRole"; userId: string; role: Role }
  | { op: "approveUser"; userId: string }
  | { op: "rejectUser"; userId: string }
  | { op: "dailySetPlayers"; names: string[] }
  | { op: "dailyUpsertDay"; day: { id?: string; date: string; lockTime: string } }
  | { op: "dailyDeleteDay"; id: string }
  | { op: "dailyUpsertMatch"; match: { id?: string; dayId: string; playerAId: string; playerBId: string; round: string; startTime: string } }
  | { op: "dailyDeleteMatch"; id: string }
  | { op: "dailySetStats"; matchId: string; rows: Omit<DailyDartsStat, "matchId">[] }
  | { op: "dailySetPicks"; dayId: string; playerIds: string[] }
  | { op: "dailySetScoring"; scoring: DailyDartsScoring }
  | { op: "dailySetTournament"; tournamentId: string }
  | { op: "eloChallenge"; opponentId: string; format: string; date: string }
  | { op: "eloRespond"; id: string; accept: boolean }
  | { op: "eloReport"; id: string; myLegs: number; theirLegs: number }
  | { op: "eloConfirm"; id: string }
  | { op: "eloVoid"; id: string; source: "challenge" | "training" }
  | { op: "eloRecompute" }
  | { op: "eloSettings"; startRating: number; trainingCounts: boolean };

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
