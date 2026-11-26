import { DEMO_NEXT } from "./seed";
import type { AppData, LeaguePlayer, ManualFixture, ScoutPlayer, Snapshot, SnapshotFixture } from "./types";
import { normName } from "./util";

export type ShownMatch = {
  key: string;
  opponent: string;
  venue: string;
  datetime: string;
  home: boolean;
  round: string;
  source: "psgz" | "manual" | "override" | "demo";
  eventUrl: string;
  scoreUs: number | null;
  scoreThem: number | null;
  played: boolean;
};

function manualMatch(fixture: ManualFixture, played: boolean): ShownMatch {
  return {
    key: `manual:${fixture.id}`,
    opponent: fixture.opponent,
    venue: fixture.venue,
    datetime: fixture.datetime,
    home: fixture.home,
    round: fixture.round || "Ručno",
    source: "manual",
    eventUrl: "",
    scoreUs: fixture.scoreUs,
    scoreThem: fixture.scoreThem,
    played,
  };
}

function isOpen(scoreUs: number | null, scoreThem: number | null, datetime: string): boolean {
  const future = new Date(datetime).getTime() >= Date.now() - 12 * 60 * 60 * 1000;
  const empty = scoreUs == null || (scoreUs === 0 && (scoreThem ?? 0) === 0);
  return future && empty;
}

export function manualUpcoming(fixtures: ManualFixture[]): ShownMatch | null {
  return (
    fixtures
      .filter((fixture) => isOpen(fixture.scoreUs, fixture.scoreThem, fixture.datetime))
      .sort((a, b) => a.datetime.localeCompare(b.datetime))
      .map((fixture) => manualMatch(fixture, false))[0] ?? null
  );
}

export function shownFixtures(data: AppData, snapshot: Snapshot | null): ShownMatch[] {
  if (data.settings.useManualSchedule) {
    return data.manualFixtures.map((fixture) =>
      manualMatch(fixture, fixture.scoreUs != null && !(fixture.scoreUs === 0 && (fixture.scoreThem ?? 0) === 0 && new Date(fixture.datetime).getTime() > Date.now())),
    );
  }
  const live = (snapshot?.fixtures ?? []).map<ShownMatch>((fixture) => ({ ...fixture, source: "psgz" }));
  const extra = data.manualFixtures.map((fixture) =>
    manualMatch(
      fixture,
      fixture.scoreUs != null && !(fixture.scoreUs === 0 && (fixture.scoreThem ?? 0) === 0 && new Date(fixture.datetime).getTime() > Date.now()),
    ),
  );
  return [...live, ...extra].sort((a, b) => a.datetime.localeCompare(b.datetime));
}

export function nextMatch(data: AppData, snapshot: Snapshot | null, snapshotMissing: boolean): ShownMatch | null {
  const override = data.settings.nextOverride;
  if (override) {
    return {
      key: "override",
      opponent: override.opponent,
      venue: override.venue,
      datetime: override.datetime,
      home: override.home,
      round: override.round || "Ručno",
      source: "override",
      eventUrl: "",
      scoreUs: null,
      scoreThem: null,
      played: false,
    };
  }
  if (data.settings.useManualSchedule) return manualUpcoming(data.manualFixtures);
  if (snapshot?.next) {
    return {
      ...snapshot.next,
      venue: snapshot.next.venue || (snapshot.next.home ? data.settings.venue : snapshot.next.venue),
      source: "psgz",
    };
  }
  const manual = manualUpcoming(data.manualFixtures);
  if (manual) return manual;
  if (snapshotMissing) {
    return {
      key: "demo",
      opponent: DEMO_NEXT.opponent,
      venue: DEMO_NEXT.venue,
      datetime: DEMO_NEXT.datetime,
      home: DEMO_NEXT.home,
      round: DEMO_NEXT.round,
      source: "demo",
      eventUrl: "",
      scoreUs: null,
      scoreThem: null,
      played: false,
    };
  }
  return null;
}

export type ScoutRow = { name: string; detail: string; value: string; hint?: string };

export function opponentBoard(opponent: string, data: AppData, snapshot: Snapshot | null, demo: boolean): { rows: ScoutRow[]; note: string } {
  const live =
    snapshot?.next && normName(snapshot.next.opponent) === normName(opponent) ? snapshot.opponentPlayers : [];
  if (live.length && !demo) {
    return {
      note: "Poredak protivnika prema bodovnom prosjeku na psgz.hr.",
      rows: live.map((player) => playerRow(player)),
    };
  }
  const manual = data.opponentScouts.find((item) => normName(item.club) === normName(opponent) && !item.demo);
  if (manual?.players.length) {
    return { note: "Ručni sastav koji je unio admin.", rows: manual.players.map(scoutRow) };
  }
  if (demo) {
    const sample = data.opponentScouts.find((item) => normName(item.club) === normName(opponent));
    if (sample?.players.length) {
      return { note: "Demo sastav iz skice. Nije službeni popis lige.", rows: sample.players.map(scoutRow) };
    }
  }
  if (live.length) return { note: "Poredak protivnika prema psgz.hr.", rows: live.map(playerRow) };
  return { note: "Nema objavljenog popisa igrača za ovog protivnika.", rows: [] };
}

function playerRow(player: LeaguePlayer): ScoutRow {
  return {
    name: player.name,
    detail: player.rank === "i.k." ? "izvan kategorije" : `${player.rank}. mjesto`,
    value: player.points.toFixed(2).replace(".", ","),
    hint: `${player.winPct.toFixed(0)}% · ${player.wl}`,
  };
}

function scoutRow(player: ScoutPlayer): ScoutRow {
  const nick = player.nickname ? `„${player.nickname}”` : "";
  return {
    name: player.name,
    detail: nick || "ručni prosjek",
    value: player.average.toFixed(2).replace(".", ","),
    hint: "3 strelice",
  };
}

export function leagueBadge(data: AppData, snapshot: Snapshot | null, snapshotMissing: boolean) {
  if (data.settings.leagueOverride) {
    const item = data.settings.leagueOverride;
    return {
      title: `${item.name} · ${item.position}. MJESTO`,
      detail: item.points == null ? "Ručni unos" : `${item.points} bod.`,
      demo: false,
      manual: true,
    };
  }
  if (snapshot && snapshot.position) {
    return {
      title: `${snapshot.leagueName} · ${snapshot.position}. MJESTO`,
      detail: snapshot.points == null ? snapshot.season : `${String(snapshot.points).replace(".", ",")} bod. · ${snapshot.played ?? 0} odigranih`,
      demo: false,
      manual: false,
    };
  }
  if (snapshotMissing) {
    return { title: "3. B LIGA · 10. MJESTO", detail: "Demo podatak, PSGZ nije dostupan", demo: true, manual: false };
  }
  return { title: "POREDAK LIGE", detail: "Učitavanje s psgz.hr", demo: false, manual: false };
}

export function resultsOf(data: AppData, snapshot: Snapshot | null): ShownMatch[] {
  return shownFixtures(data, snapshot)
    .filter((fixture) => fixture.played || (fixture.scoreUs != null && fixture.scoreThem != null && (fixture.scoreUs > 0 || fixture.scoreThem > 0)))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
}

export type { SnapshotFixture };
