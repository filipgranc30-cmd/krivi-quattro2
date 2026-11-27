import { isCest } from "./dates";
import { cloneDailyDarts, DEFAULT_PDC_TOURNAMENT } from "./daily-darts";
import type { DailyDartsMatch, DailyDartsPlayer, DailyDartsStat, DailyDartsState } from "./types";
import { normName, uid } from "./util";

export type PdcPlayer = { externalId: string; name: string };

export type PdcFixture = {
  fixtureId: string;
  stage: string;
  ukDate: string;
  ukTime: string;
  status: string;
  player1: PdcPlayer | null;
  player2: PdcPlayer | null;
  winnerExternalId: string | null;
  tournamentId?: string;
  tournamentName?: string;
};

export type PdcTournamentFeed = { id: string; name: string; fixtures: PdcFixture[] };

export function parsePdcTournament(body: unknown): PdcFixture[] | null {
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? root;
  const attributes = asRecord(data?.attributes);
  const stages = attributes?.stages;
  if (!attributes || !Array.isArray(stages)) return null;
  const tournamentName = text(attributes.name);
  const fixtures: PdcFixture[] = [];
  for (const stageRow of stages) {
    const stage = asRecord(stageRow);
    const stageName = text(asRecord(stage?.stage)?.name) || "Kolo";
    const rows = stage?.fixtures;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const fixture = asRecord(row);
      const fixtureId = text(fixture?.fixtureID);
      const ukDate = text(fixture?.startDate);
      const ukTime = clock(fixture?.startTime);
      if (!fixtureId || !/^\d{4}-\d{2}-\d{2}$/.test(ukDate) || !ukTime) continue;
      const player1 = participant(fixture?.participant1);
      const player2 = participant(fixture?.participant2);
      const winnerExternalId = text(fixture?.winnerParticipantID);
      fixtures.push({
        fixtureId,
        stage: stageName.slice(0, 40),
        ukDate,
        ukTime,
        status: text(fixture?.status),
        player1,
        player2,
        winnerExternalId: winnerExternalId || null,
        tournamentName,
      });
    }
  }
  return fixtures;
}

export function tournamentNameOf(body: unknown): string {
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? root;
  return text(asRecord(data?.attributes)?.name);
}

export function ukToZagreb(date: string, time: string): { date: string; time: string } | null {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day || !/^\d{2}:\d{2}$/.test(time)) return null;
  const ukOffset = isCest(year, month, day) ? "+01:00" : "+00:00";
  const instant = new Date(`${date}T${time}:00${ukOffset}`);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const zagrebDate = `${get("year")}-${get("month")}-${get("day")}`;
  const zagrebTime = `${get("hour")}:${get("minute")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zagrebDate) || !/^\d{2}:\d{2}$/.test(zagrebTime)) return null;
  return { date: zagrebDate, time: zagrebTime };
}

export function applyPdcImport(state: DailyDartsState, fixtures: PdcFixture[], syncedAt = new Date().toISOString()): { state: DailyDartsState; message: string } {
  const next = cloneDailyDarts(state);
  let newPlayers = 0;
  let newDays = 0;
  let newMatches = 0;
  let winners = 0;
  let skipped = 0;
  const byExternal = new Map(next.players.filter((player) => player.externalId).map((player) => [player.externalId as string, player]));
  const daySlots = new Map<string, { instant: string; time: string }[]>();

  const ensurePlayer = (person: PdcPlayer | null): DailyDartsPlayer | null => {
    if (!person) return null;
    const known = byExternal.get(person.externalId) ?? next.players.find((player) => normName(player.name) === normName(person.name));
    if (known) {
      if (!known.externalId) known.externalId = person.externalId;
      byExternal.set(person.externalId, known);
      return known;
    }
    const created: DailyDartsPlayer = { id: uid(), name: person.name, externalId: person.externalId };
    next.players.push(created);
    byExternal.set(person.externalId, created);
    newPlayers += 1;
    return created;
  };

  for (const fixture of fixtures) {
    const when = ukToZagreb(fixture.ukDate, fixture.ukTime);
    if (!when) {
      skipped += 1;
      continue;
    }
    const slots = daySlots.get(fixture.ukDate) ?? [];
    slots.push({ instant: `${fixture.ukDate}T${fixture.ukTime}`, time: when.time });
    daySlots.set(fixture.ukDate, slots);
    let day = next.days.find((item) => item.date === fixture.ukDate);
    if (!day) {
      day = { id: uid(), date: fixture.ukDate, lockTime: when.time, lockOverridden: false };
      next.days.push(day);
      newDays += 1;
    }
    const home = ensurePlayer(fixture.player1);
    const away = ensurePlayer(fixture.player2);
    if (!home || !away || home.id === away.id) {
      skipped += 1;
      continue;
    }
    let match = next.matches.find((item) => item.externalId === fixture.fixtureId);
    if (!match) {
      match = {
        id: uid(),
        dayId: day.id,
        playerAId: home.id,
        playerBId: away.id,
        round: fixture.stage,
        startTime: when.time,
        externalId: fixture.fixtureId,
        source: "pdc",
        tournamentId: fixture.tournamentId,
        tournamentName: fixture.tournamentName,
      };
      next.matches.push(match);
      newMatches += 1;
    } else if (match.source !== "manual") {
      match.dayId = day.id;
      match.playerAId = home.id;
      match.playerBId = away.id;
      match.round = fixture.stage;
      match.startTime = when.time;
      match.source = "pdc";
      match.tournamentId = fixture.tournamentId;
      match.tournamentName = fixture.tournamentName;
    }
    if (fixture.status === "Result" && fixture.winnerExternalId) {
      const winner = fixture.winnerExternalId === home.externalId ? home : fixture.winnerExternalId === away.externalId ? away : null;
      if (winner && markWinner(next.stats, match, home.id, away.id, winner.id)) winners += 1;
    }
  }

  for (const day of next.days) {
    if (day.lockOverridden) continue;
    const earliest = (daySlots.get(day.date) ?? []).sort((a, b) => a.instant.localeCompare(b.instant))[0];
    if (earliest) day.lockTime = earliest.time;
  }

  next.lastSyncAt = syncedAt;
  next.lastSyncMessage = `PDC ${next.tournamentId || DEFAULT_PDC_TOURNAMENT}: ${newPlayers} novih igrača, ${newDays} dana, ${newMatches} mečeva, ${winners} pobjednika, ${skipped} preskočeno.`;
  return { state: next, message: next.lastSyncMessage };
}

function markWinner(stats: DailyDartsStat[], match: DailyDartsMatch, homeId: string, awayId: string, winnerId: string): boolean {
  let changed = false;
  for (const playerId of [homeId, awayId]) {
    const won = playerId === winnerId;
    const existing = stats.find((stat) => stat.matchId === match.id && stat.playerId === playerId);
    if (!existing) {
      stats.push(emptyStat(match.id, playerId, won));
      changed = true;
    } else if (existing.won !== won) {
      existing.won = won;
      changed = true;
    }
  }
  return changed;
}

function emptyStat(matchId: string, playerId: string, won: boolean): DailyDartsStat {
  return {
    matchId,
    playerId,
    won,
    average: 0,
    count180: 0,
    count140: 0,
    count100: 0,
    checkoutHits: 0,
    checkoutAttempts: 0,
    checkoutOver100: 0,
    highestCheckout: 0,
  };
}

function participant(value: unknown): PdcPlayer | null {
  const row = asRecord(value);
  if (!row) return null;
  const first = text(row.firstName);
  const last = text(row.lastName);
  if (!first || !last || first.toUpperCase() === "N/A" || last.toUpperCase() === "N/A") return null;
  const externalId = text(row.participantID);
  if (!externalId) return null;
  return { externalId, name: `${first} ${last}` };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function clock(value: unknown): string {
  const raw = text(value);
  const match = raw.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}
