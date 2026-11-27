import { isCest } from "./dates";
import type { Action, DailyDartsDay, DailyDartsMatch, DailyDartsPick, DailyDartsPlayer, DailyDartsScoring, DailyDartsStat, DailyDartsState, PublicDailyDarts, UserPublic } from "./types";
import { normName, uid } from "./util";

export const DEFAULT_SCORING: DailyDartsScoring = {
  win: 10,
  averageBase: 90,
  averagePoint: 1,
  oneEighty: 3,
  oneForty: 1,
  oneHundred: 0.5,
  checkoutPercentStep: 10,
  checkoutPercentPoint: 1,
  checkoutOver100: 5,
  highest100: 3,
  highest150: 6,
  highest170: 15,
};

export const TOURNAMENT_START = "2026-12-11";
export const TOURNAMENT_END = "2027-01-03";
export const TEASER_START = "2026-11-27";
export const TEASER_END = "2027-01-04";

export const DEFAULT_PDC_TOURNAMENT = "10873";
export const TRIAL_TOURNAMENT_ID = "10872";
export const DEFAULT_TOURNAMENT_IDS = [TRIAL_TOURNAMENT_ID, DEFAULT_PDC_TOURNAMENT];

export function defaultDailyDarts(): DailyDartsState {
  return {
    players: [],
    days: [],
    matches: [],
    stats: [],
    picks: [],
    scoring: { ...DEFAULT_SCORING },
    reminderSent: [],
    tournamentId: DEFAULT_PDC_TOURNAMENT,
    tournamentIds: [...DEFAULT_TOURNAMENT_IDS],
    lastSyncAt: "",
    lastSyncMessage: "",
  };
}

export function tournamentIdsOf(state: { tournamentIds?: string[]; tournamentId?: string } | undefined): string[] {
  const raw = state?.tournamentIds?.length ? state.tournamentIds : state?.tournamentId ? [state.tournamentId] : DEFAULT_TOURNAMENT_IDS;
  const ids = [...new Set(raw.map((id) => id.trim()).filter((id) => /^\d{3,8}$/.test(id)))];
  return ids.length ? ids : [...DEFAULT_TOURNAMENT_IDS];
}

export function isTrialTournament(id: string | undefined): boolean {
  return id === TRIAL_TOURNAMENT_ID;
}

export function cloneDailyDarts(state: DailyDartsState | undefined): DailyDartsState {
  const source = state ?? defaultDailyDarts();
  return {
    players: source.players.map((item) => ({ ...item })),
    days: source.days.map((item) => ({ ...item })),
    matches: source.matches.map((item) => ({ ...item })),
    stats: source.stats.map((item) => normalizeStat(item)),
    picks: source.picks.map((item) => ({ ...item, playerIds: [...item.playerIds] })),
    scoring: knownScoring(source.scoring),
    reminderSent: [...(source.reminderSent ?? [])],
    tournamentId: source.tournamentId || DEFAULT_PDC_TOURNAMENT,
    tournamentIds: tournamentIdsOf(source),
    lastSyncAt: source.lastSyncAt || "",
    lastSyncMessage: source.lastSyncMessage || "",
  };
}

export function zagrebDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const offset = isCest(year, month, day) ? "+02:00" : "+01:00";
  const parsed = new Date(`${date}T${time}:00${offset}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function lockInstant(day: DailyDartsDay): string {
  return zagrebDateTime(day.date, day.lockTime || "13:30");
}

export function isDayLocked(day: DailyDartsDay, now = new Date()): boolean {
  const instant = lockInstant(day);
  return Boolean(instant) && now.getTime() >= new Date(instant).getTime();
}

export function playerDayPoints(stat: DailyDartsStat | undefined, scoring: DailyDartsScoring): number {
  if (!stat) return 0;
  const row = normalizeStat(stat);
  const rules = knownScoring(scoring);
  const average = Math.round(row.average * 100) / 100;
  const above = Math.max(0, Math.floor(average - rules.averageBase + 1e-9));
  return (
    (row.won ? rules.win : 0) +
    above * rules.averagePoint +
    row.count180 * rules.oneEighty +
    row.count140 * rules.oneForty +
    row.count100 * rules.oneHundred +
    checkoutPercentPoints(row.checkoutHits, row.checkoutAttempts, rules) +
    row.checkoutOver100 * rules.checkoutOver100 +
    highestCheckoutBonus(row.highestCheckout, rules)
  );
}

function checkoutPercentPoints(hits: number, attempts: number, scoring: DailyDartsScoring): number {
  if (attempts <= 0 || scoring.checkoutPercentStep <= 0) return 0;
  const percent = (hits / attempts) * 100;
  const steps = Math.floor(percent / scoring.checkoutPercentStep + 1e-9);
  return Math.max(0, steps) * scoring.checkoutPercentPoint;
}

function highestCheckoutBonus(value: number, scoring: DailyDartsScoring): number {
  if (value >= 170) return scoring.highest170;
  if (value >= 150) return scoring.highest150;
  if (value >= 100) return scoring.highest100;
  return 0;
}

export function statsForPlayerOnDay(state: DailyDartsState, dayId: string, playerId: string): DailyDartsStat | undefined {
  const matchIds = new Set(state.matches.filter((match) => match.dayId === dayId).map((match) => match.id));
  return state.stats.find((stat) => stat.playerId === playerId && matchIds.has(stat.matchId));
}

export function memberDayPoints(state: DailyDartsState, pick: DailyDartsPick): number {
  return pick.playerIds.reduce((sum, playerId) => sum + playerDayPoints(statsForPlayerOnDay(state, pick.dayId, playerId), state.scoring), 0);
}

export function playersOnDay(state: DailyDartsState, dayId: string): DailyDartsPlayer[] {
  const ids = new Set<string>();
  for (const match of state.matches) {
    if (match.dayId !== dayId) continue;
    ids.add(match.playerAId);
    ids.add(match.playerBId);
  }
  return state.players.filter((player) => ids.has(player.id));
}

/** Replace stats for one match. Used by the admin form and ready for a later automatic import. */
export function upsertMatchStats(state: DailyDartsState, matchId: string, rows: Omit<DailyDartsStat, "matchId">[]): { state: DailyDartsState; error?: string } {
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return { state, error: "Meč nije pronađen." };
  const allowed = new Set([match.playerAId, match.playerBId]);
  const clean: DailyDartsStat[] = [];
  for (const row of rows) {
    if (!allowed.has(row.playerId)) return { state, error: "Statistika mora biti za igrače tog meča." };
    const average = Number(row.average);
    if (!Number.isFinite(average) || average < 0 || average > 180) return { state, error: "Prosjek nije ispravan." };
    const hits = count(row.checkoutHits);
    const attempts = count(row.checkoutAttempts);
    if (hits > attempts) return { state, error: "Izlazi: pogođeno ne može biti veće od pokušaja." };
    const highest = checkoutScore(row.highestCheckout);
    if (Number(row.highestCheckout) > 170) return { state, error: "Najveći izlaz je od 0 do 170." };
    clean.push(normalizeStat({
      matchId,
      playerId: row.playerId,
      won: Boolean(row.won),
      average: Math.round(average * 100) / 100,
      count180: count(row.count180),
      count140: count(row.count140),
      count100: count(row.count100),
      checkoutHits: hits,
      checkoutAttempts: attempts,
      checkoutOver100: count(row.checkoutOver100),
      highestCheckout: highest,
    }));
  }
  if (clean.filter((row) => row.won).length > 1) return { state, error: "Samo jedan igrač može dobiti meč." };
  return { state: { ...state, stats: [...state.stats.filter((stat) => stat.matchId !== matchId), ...clean] } };
}

export function publicDailyDarts(state: DailyDartsState | undefined, viewer: UserPublic | null, now = new Date()): PublicDailyDarts {
  const daily = cloneDailyDarts(state);
  const locked = new Set(daily.days.filter((day) => isDayLocked(day, now)).map((day) => day.id));
  return {
    scoring: daily.scoring,
    players: [...daily.players].sort((a, b) => a.name.localeCompare(b.name, "hr")),
    days: [...daily.days].sort((a, b) => a.date.localeCompare(b.date)),
    matches: [...daily.matches].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.round.localeCompare(b.round, "hr")),
    stats: daily.stats,
    myPicks: viewer ? daily.picks.filter((pick) => pick.userId === viewer.id) : [],
    revealedPicks: daily.picks.filter((pick) => locked.has(pick.dayId)),
    pickCounts: daily.days.map((day) => ({ dayId: day.id, count: daily.picks.filter((pick) => pick.dayId === day.id).length })),
    tournamentIds: tournamentIdsOf(daily),
    lastSyncAt: daily.lastSyncAt || "",
    lastSyncMessage: daily.lastSyncMessage || "",
  };
}

export function focusDay(days: DailyDartsDay[], today: string): DailyDartsDay | null {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((day) => day.date >= today) ?? sorted.at(-1) ?? null;
}

export type DailyRankRow = { userId: string; name: string; points: number; picks: number };

export function dailyRanking(state: DailyDartsState, dayId: string): DailyRankRow[] {
  return state.picks
    .filter((pick) => pick.dayId === dayId)
    .map((pick) => ({ userId: pick.userId, name: pick.userName, points: memberDayPoints(state, pick), picks: pick.playerIds.length }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "hr"));
}

export type OverallRow = { userId: string; name: string; points: number; days: number; bestDay: number; bestDayId: string };

export function dayIdsForTournament(state: DailyDartsState, tournamentId: string): Set<string> {
  const ids = new Set<string>();
  for (const match of state.matches) {
    if (match.tournamentId === tournamentId) ids.add(match.dayId);
  }
  return ids;
}

export function defaultTournamentId(state: DailyDartsState, today: string): string {
  const focus = focusDay(state.days, today);
  const fromDay = focus ? state.matches.find((match) => match.dayId === focus.id && match.tournamentId)?.tournamentId : undefined;
  return fromDay || tournamentIdsOf(state)[0];
}

export function overallRanking(state: DailyDartsState, now = new Date(), tournamentId?: string): OverallRow[] {
  const allowedDays = tournamentId ? dayIdsForTournament(state, tournamentId) : null;
  const locked = new Set(state.days.filter((day) => isDayLocked(day, now) && (!allowedDays || allowedDays.has(day.id))).map((day) => day.id));
  const map = new Map<string, OverallRow>();
  for (const pick of state.picks) {
    if (!locked.has(pick.dayId)) continue;
    const points = memberDayPoints(state, pick);
    const row = map.get(pick.userId) ?? { userId: pick.userId, name: pick.userName, points: 0, days: 0, bestDay: 0, bestDayId: pick.dayId };
    row.points += points;
    row.days += 1;
    if (points > row.bestDay) {
      row.bestDay = points;
      row.bestDayId = pick.dayId;
    }
    map.set(pick.userId, row);
  }
  return [...map.values()].sort((a, b) => b.points - a.points || b.bestDay - a.bestDay || a.name.localeCompare(b.name, "hr"));
}

export function mostPickedPlayer(state: DailyDartsState, now = new Date(), tournamentId?: string): { player: DailyDartsPlayer; count: number } | null {
  const allowedDays = tournamentId ? dayIdsForTournament(state, tournamentId) : null;
  const locked = new Set(state.days.filter((day) => isDayLocked(day, now) && (!allowedDays || allowedDays.has(day.id))).map((day) => day.id));
  const counts = new Map<string, number>();
  for (const pick of state.picks) {
    if (!locked.has(pick.dayId)) continue;
    for (const playerId of pick.playerIds) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
  }
  let best: { player: DailyDartsPlayer; count: number } | null = null;
  for (const [playerId, count] of counts) {
    const player = state.players.find((item) => item.id === playerId);
    if (!player) continue;
    if (!best || count > best.count) best = { player, count };
  }
  return best;
}

export function replacePlayers(state: DailyDartsState, names: string[]): DailyDartsState {
  const next: DailyDartsPlayer[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.replace(/\s+/g, " ").trim();
    const key = normName(name);
    if (name.length < 2 || !key || seen.has(key)) continue;
    seen.add(key);
    const existing = state.players.find((player) => normName(player.name) === key);
    next.push(existing ? { ...existing, name } : { id: uid(), name });
  }
  const keep = new Set(next.map((player) => player.id));
  return {
    ...state,
    players: next,
    matches: state.matches.filter((match) => keep.has(match.playerAId) && keep.has(match.playerBId)),
    stats: state.stats.filter((stat) => keep.has(stat.playerId)),
    picks: state.picks.map((pick) => ({ ...pick, playerIds: pick.playerIds.filter((id) => keep.has(id)) })).filter((pick) => pick.playerIds.length === 4),
  };
}

export function applyDailyAction(state: DailyDartsState, actor: UserPublic, action: Action, isAdmin: boolean): { state: DailyDartsState; error?: string } {
  if (action.op === "dailySetPicks") {
    const day = state.days.find((item) => item.id === action.dayId);
    if (!day) return { state, error: "Taj dan nije otvoren." };
    if (isDayLocked(day)) return { state, error: "Odabir je zaključan." };
    const ids = [...new Set(action.playerIds)];
    const allowed = new Set(dayPlayersFromMatches(state.matches, state.players, day.id));
    if (ids.length !== 4 || ids.some((id) => !allowed.has(id))) return { state, error: "Odaberi točno 4 igrača s današnjih mečeva." };
    const pick: DailyDartsPick = {
      id: state.picks.find((item) => item.dayId === day.id && item.userId === actor.id)?.id ?? uid(),
      dayId: day.id,
      userId: actor.id,
      userName: actor.name,
      playerIds: ids,
      updatedAt: new Date().toISOString(),
    };
    return { state: { ...state, picks: [...state.picks.filter((item) => item.id !== pick.id), pick] } };
  }
  if (!isAdmin) return { state, error: "Samo admin može uređivati Daily Darts." };
  if (action.op === "dailySetPlayers") return { state: replacePlayers(state, action.names) };
  if (action.op === "dailySetScoring") {
    const scoring = sanitizeScoring(action.scoring);
    if (!scoring) return { state, error: "Bodovi nisu ispravni." };
    return { state: { ...state, scoring } };
  }
  if (action.op === "dailyUpsertDay") {
    const date = action.day.date;
    const lockTime = /^\d{2}:\d{2}$/.test(action.day.lockTime) ? action.day.lockTime : "13:30";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { state, error: "Datum nije ispravan." };
    if (state.days.some((day) => day.date === date && day.id !== action.day.id)) return { state, error: "Taj datum već postoji." };
    const previous = state.days.find((item) => item.id === action.day.id);
    const day: DailyDartsDay = { id: action.day.id || previous?.id || uid(), date, lockTime, lockOverridden: true };
    const days = state.days.some((item) => item.id === day.id) ? state.days.map((item) => (item.id === day.id ? { ...item, ...day } : item)) : [...state.days, day];
    return { state: { ...state, days } };
  }
  if (action.op === "dailyDeleteDay") {
    const matchIds = new Set(state.matches.filter((match) => match.dayId === action.id).map((match) => match.id));
    return {
      state: {
        ...state,
        days: state.days.filter((day) => day.id !== action.id),
        matches: state.matches.filter((match) => match.dayId !== action.id),
        stats: state.stats.filter((stat) => !matchIds.has(stat.matchId)),
        picks: state.picks.filter((pick) => pick.dayId !== action.id),
      },
    };
  }
  if (action.op === "dailyUpsertMatch") {
    const { dayId, playerAId, playerBId } = action.match;
    if (!state.days.some((day) => day.id === dayId)) return { state, error: "Dan nije pronađen." };
    if (!playerAId || !playerBId || playerAId === playerBId) return { state, error: "Odaberi dva različita igrača." };
    if (!state.players.some((player) => player.id === playerAId) || !state.players.some((player) => player.id === playerBId)) {
      return { state, error: "Igrač nije na popisu." };
    }
    const startTime = /^\d{2}:\d{2}$/.test(action.match.startTime) ? action.match.startTime : "";
    const previous = state.matches.find((item) => item.id === action.match.id);
    const match: DailyDartsMatch = {
      id: action.match.id || uid(),
      dayId,
      playerAId,
      playerBId,
      round: action.match.round.replace(/\s+/g, " ").trim().slice(0, 40),
      startTime,
      externalId: previous?.externalId,
      source: previous?.source ?? "manual",
    };
    const matches = state.matches.some((item) => item.id === match.id) ? state.matches.map((item) => (item.id === match.id ? match : item)) : [...state.matches, match];
    return { state: { ...state, matches } };
  }
  if (action.op === "dailyDeleteMatch") {
    return {
      state: {
        ...state,
        matches: state.matches.filter((match) => match.id !== action.id),
        stats: state.stats.filter((stat) => stat.matchId !== action.id),
      },
    };
  }
  if (action.op === "dailySetStats") return upsertMatchStats(state, action.matchId, action.rows);
  if (action.op === "dailySetTournament") {
    const ids = [...new Set(action.tournamentId.split(/[^0-9]+/).filter((id) => /^\d{3,8}$/.test(id)))];
    if (!ids.length) return { state, error: "Upiši PDC ID-eve, npr. 10872, 10873." };
    return { state: { ...state, tournamentIds: ids, tournamentId: ids[0] } };
  }
  return { state };
}

function sanitizeScoring(input: DailyDartsScoring): DailyDartsScoring | null {
  const next = { ...DEFAULT_SCORING };
  for (const key of Object.keys(DEFAULT_SCORING) as (keyof DailyDartsScoring)[]) {
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > 500) return null;
    next[key] = key === "averageBase" ? Math.round(value) : Math.round(value * 100) / 100;
  }
  return next;
}

function normalizeStat(raw: Partial<DailyDartsStat> & { matchId?: string; playerId?: string }): DailyDartsStat {
  return {
    matchId: raw.matchId || "",
    playerId: raw.playerId || "",
    won: Boolean(raw.won),
    average: Number(raw.average) || 0,
    count180: count(Number(raw.count180) || 0),
    count140: count(Number(raw.count140) || 0),
    count100: count(Number(raw.count100) || 0),
    checkoutHits: count(Number(raw.checkoutHits) || 0),
    checkoutAttempts: count(Number(raw.checkoutAttempts) || 0),
    checkoutOver100: count(Number(raw.checkoutOver100) || 0),
    highestCheckout: checkoutScore(raw.highestCheckout),
  };
}

function checkoutScore(value: unknown): number {
  const parsed = Math.round(Number(value) || 0);
  if (parsed < 0) return 0;
  return Math.min(170, parsed);
}

function knownScoring(input: Partial<DailyDartsScoring> | undefined): DailyDartsScoring {
  const next = { ...DEFAULT_SCORING };
  if (!input) return next;
  for (const key of Object.keys(DEFAULT_SCORING) as (keyof DailyDartsScoring)[]) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) next[key] = value;
  }
  return next;
}

function count(value: number): number {
  const parsed = Math.round(Number(value) || 0);
  if (parsed < 0) return 0;
  return Math.min(99, parsed);
}

export function dayPlayersFromMatches(matches: DailyDartsMatch[], players: DailyDartsPlayer[], dayId: string): string[] {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.dayId !== dayId) continue;
    ids.add(match.playerAId);
    ids.add(match.playerBId);
  }
  return players.filter((player) => ids.has(player.id)).map((player) => player.id);
}
