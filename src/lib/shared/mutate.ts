import type { Action, AppData, Db, Member, NotificationItem, UserPublic } from "./types";
import { clampText, firstName, normName, uid } from "./util";

export type MutateResult = {
  db: Db;
  error?: string;
  push?: { title: string; body: string; url: string };
};

function requireAdmin(actor: UserPublic): string | null {
  return actor.role === "admin" ? null : "Samo trener ili admin može mijenjati ove podatke.";
}

function notifyOthers(db: Db, actor: UserPublic, title: string, body: string, href: string) {
  const now = new Date().toISOString();
  for (const user of db.users) {
    if (user.id === actor.id) continue;
    db.notifications.push({
      id: uid(),
      userId: user.id,
      title,
      body,
      href,
      createdAt: now,
      read: false,
    });
  }
  const grouped = new Map<string, NotificationItem[]>();
  for (const item of db.notifications) {
    const list = grouped.get(item.userId) ?? [];
    list.push(item);
    grouped.set(item.userId, list);
  }
  const next: NotificationItem[] = [];
  for (const list of grouped.values()) next.push(...list.slice(-100));
  db.notifications = next;
}

function adminCount(db: Db): number {
  return db.users.filter((user) => user.role === "admin").length;
}

export function applyAction(db: Db, actor: UserPublic, action: Action): MutateResult {
  const next: Db = {
    ...db,
    users: db.users.map((user) => ({ ...user })),
    sessions: db.sessions.slice(),
    attendance: db.attendance.map((item) => ({ ...item })),
    notifications: db.notifications.map((item) => ({ ...item })),
    manualFixtures: db.manualFixtures.map((item) => ({ ...item })),
    roster: db.roster.map((item) => ({ ...item })),
    opponentScouts: db.opponentScouts.map((item) => ({ ...item, players: item.players.map((p) => ({ ...p })) })),
    games: db.games.map((item) => ({ ...item, players: item.players.map((p) => ({ ...p })) })),
    settings: { ...db.settings },
    pushSubs: db.pushSubs.map((item) => ({ ...item })),
  };

  switch (action.op) {
    case "attendance": {
      const targetId = clampText(action.targetId, 160);
      const label = clampText(action.label, 160);
      if (!targetId) return { db, error: "Nedostaje događaj." };
      if (action.status !== "dolazim" && action.status !== "ne_dolazim" && action.status !== "mozda") {
        return { db, error: "Nepoznat status." };
      }
      const existing = next.attendance.find(
        (item) => item.userId === actor.id && item.kind === action.kind && item.targetId === targetId,
      );
      const wasComing = existing?.status === "dolazim";
      if (existing) {
        existing.status = action.status;
        existing.userName = actor.name;
        existing.updatedAt = new Date().toISOString();
      } else {
        next.attendance.push({
          id: uid(),
          kind: action.kind,
          targetId,
          userId: actor.id,
          userName: actor.name,
          status: action.status,
          updatedAt: new Date().toISOString(),
        });
      }
      if (next.attendance.length > 4000) next.attendance = next.attendance.slice(-4000);
      let push: MutateResult["push"];
      if (action.status === "dolazim" && !wasComing) {
        const body =
          action.kind === "training"
            ? `${firstName(actor.name)} dolazi na trening u ${label || "zakazani termin"}`
            : `${firstName(actor.name)} dolazi na utakmicu: ${label || "sljedeći susret"}`;
        const href = action.kind === "training" ? "/trening" : "/dashboard";
        notifyOthers(next, actor, "Dolazak", body, href);
        push = { title: "Krivi Quattro", body, url: href };
      }
      return { db: next, push };
    }
    case "readNotifications": {
      for (const item of next.notifications) {
        if (item.userId === actor.id) item.read = true;
      }
      return { db: next };
    }
    case "addFixture": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const fixture = sanitizeFixture(action.fixture);
      if (!fixture) return { db, error: "Provjeri protivnika, datum i mjesto." };
      const saved = { ...fixture, id: uid() };
      next.manualFixtures.push(saved);
      const when = new Date(saved.datetime).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" });
      const body = `${firstName(actor.name)} je dodao utakmicu: vs ${saved.opponent}, ${when}`;
      notifyOthers(next, actor, "Raspored", body, "/raspored");
      return { db: next, push: { title: "Novi termin", body, url: "/raspored" } };
    }
    case "updateFixture": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const fixture = sanitizeFixture(action.fixture);
      if (!fixture || !action.fixture.id) return { db, error: "Utakmica nije ispravna." };
      const index = next.manualFixtures.findIndex((item) => item.id === action.fixture.id);
      if (index < 0) return { db, error: "Utakmica nije pronađena." };
      next.manualFixtures[index] = { ...fixture, id: action.fixture.id };
      const body = `${firstName(actor.name)} je ažurirao raspored: vs ${fixture.opponent}`;
      notifyOthers(next, actor, "Raspored", body, "/raspored");
      return { db: next, push: { title: "Raspored", body, url: "/raspored" } };
    }
    case "deleteFixture": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      next.manualFixtures = next.manualFixtures.filter((item) => item.id !== action.id);
      const body = `${firstName(actor.name)} je uklonio utakmicu s rasporeda`;
      notifyOthers(next, actor, "Raspored", body, "/raspored");
      return { db: next, push: { title: "Raspored", body, url: "/raspored" } };
    }
    case "setSettings": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const settings = sanitizeSettings(action.settings);
      const scheduleChanged =
        JSON.stringify(settings.nextOverride) !== JSON.stringify(next.settings.nextOverride) ||
        settings.useManualSchedule !== next.settings.useManualSchedule ||
        JSON.stringify(settings.leagueOverride) !== JSON.stringify(next.settings.leagueOverride);
      next.settings = settings;
      if (scheduleChanged) {
        const body = `${firstName(actor.name)} je izmijenio raspored ili podatke lige`;
        notifyOthers(next, actor, "Raspored", body, "/raspored");
        return { db: next, push: { title: "Raspored", body, url: "/dashboard" } };
      }
      return { db: next };
    }
    case "upsertRoster": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const name = clampText(action.player.name, 80);
      if (name.length < 2) return { db, error: "Upiši ime igrača." };
      const player = {
        id: action.player.id || uid(),
        name,
        nickname: clampText(action.player.nickname || "", 40),
        average:
          action.player.average == null || Number.isNaN(Number(action.player.average))
            ? null
            : Math.round(Number(action.player.average) * 100) / 100,
        demo: Boolean(action.player.demo),
      };
      const index = next.roster.findIndex((item) => item.id === player.id);
      if (index >= 0) next.roster[index] = player;
      else next.roster.push(player);
      return { db: next };
    }
    case "deleteRoster": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      next.roster = next.roster.filter((item) => item.id !== action.id);
      return { db: next };
    }
    case "setScout": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const club = clampText(action.scout.club, 80);
      if (club.length < 2) return { db, error: "Upiši ime protivničkog kluba." };
      const players = (action.scout.players || [])
        .map((player) => ({
          name: clampText(player.name, 80),
          nickname: clampText(player.nickname || "", 40),
          average: Math.round(Number(player.average) * 100) / 100,
        }))
        .filter((player) => player.name && Number.isFinite(player.average));
      const scout = { club, demo: Boolean(action.scout.demo), players };
      const index = next.opponentScouts.findIndex((item) => normName(item.club) === normName(club));
      if (index >= 0) next.opponentScouts[index] = scout;
      else next.opponentScouts.push(scout);
      return { db: next };
    }
    case "deleteScout": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      next.opponentScouts = next.opponentScouts.filter((item) => normName(item.club) !== normName(action.club));
      return { db: next };
    }
    case "saveGame": {
      const players = (action.game.players || []).filter((player) => clampText(player.name, 80));
      if (!players.length) return { db, error: "Igra nema igrače." };
      next.games.push({
        id: uid(),
        type: action.game.type,
        playedAt: action.game.playedAt || new Date().toISOString(),
        summary: clampText(action.game.summary || "", 180),
        players: players.map((player) => ({
          ...player,
          name: clampText(player.name, 80),
        })),
      });
      if (next.games.length > 400) next.games = next.games.slice(-400);
      return { db: next };
    }
    case "deleteGame": {
      const game = next.games.find((item) => item.id === action.id);
      if (!game) return { db, error: "Igra nije pronađena." };
      const playedByActor = game.players.some((player) => player.userId === actor.id);
      if (actor.role !== "admin" && !playedByActor) return { db, error: "Ne možeš obrisati tu igru." };
      next.games = next.games.filter((item) => item.id !== action.id);
      return { db: next };
    }
    case "setRole": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const user = next.users.find((item) => item.id === action.userId);
      if (!user) return { db, error: "Član nije pronađen." };
      if (action.role !== "admin" && action.role !== "member") return { db, error: "Nepoznata uloga." };
      if (user.role === "admin" && action.role !== "admin" && adminCount(next) <= 1) {
        return { db, error: "Mora ostati barem jedan admin." };
      }
      user.role = action.role;
      return { db: next };
    }
    default:
      return { db, error: "Nepoznata radnja." };
  }
}

function sanitizeFixture(input: Omit<import("./types").ManualFixture, "id"> | import("./types").ManualFixture) {
  const opponent = clampText(input.opponent || "", 80);
  const venue = clampText(input.venue || "", 120);
  const datetime = input.datetime;
  if (opponent.length < 2 || !datetime || Number.isNaN(new Date(datetime).getTime())) return null;
  const score = (value: number | null) => {
    if (value == null || value === ("" as unknown)) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 99) return null;
    return Math.round(n);
  };
  return {
    opponent,
    venue,
    datetime: new Date(datetime).toISOString(),
    home: Boolean(input.home),
    league: clampText(input.league || "3.LIGA SKUPINA B", 80),
    round: clampText(input.round || "", 40),
    scoreUs: score(input.scoreUs),
    scoreThem: score(input.scoreThem),
  };
}

function sanitizeSettings(input: import("./types").Settings): import("./types").Settings {
  const nextOverride = input.nextOverride
    ? {
        opponent: clampText(input.nextOverride.opponent || "", 80),
        venue: clampText(input.nextOverride.venue || "", 120),
        datetime: input.nextOverride.datetime,
        home: Boolean(input.nextOverride.home),
        round: clampText(input.nextOverride.round || "", 40),
      }
    : null;
  const validOverride =
    nextOverride &&
    nextOverride.opponent.length >= 2 &&
    !Number.isNaN(new Date(nextOverride.datetime).getTime())
      ? { ...nextOverride, datetime: new Date(nextOverride.datetime).toISOString() }
      : null;
  const league = input.leagueOverride;
  const leagueOverride =
    league && league.name && Number.isFinite(Number(league.position))
      ? {
          name: clampText(league.name, 80),
          position: Math.max(1, Math.round(Number(league.position))),
          points: league.points == null || !Number.isFinite(Number(league.points)) ? null : Number(league.points),
        }
      : null;
  const time = /^\d{2}:\d{2}$/.test(input.trainingTime || "") ? input.trainingTime : "18:00";
  return {
    clubName: clampText(input.clubName || "Krivi Quattro", 80),
    trainingTime: time,
    venue: clampText(input.venue || "", 120),
    leagueOverride,
    nextOverride: validOverride,
    useManualSchedule: Boolean(input.useManualSchedule),
  };
}

export function toPublic(db: Db, viewer: UserPublic | null): AppData {
  const isAdmin = viewer?.role === "admin";
  const members: Member[] = db.users
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      email: isAdmin ? user.email : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "hr"));
  const notifications = viewer
    ? db.notifications
        .filter((item) => item.userId === viewer.id)
        .slice(-80)
        .reverse()
    : [];
  return {
    attendance: db.attendance,
    notifications,
    manualFixtures: [...db.manualFixtures].sort((a, b) => a.datetime.localeCompare(b.datetime)),
    roster: db.roster,
    opponentScouts: db.opponentScouts,
    games: [...db.games].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    settings: db.settings,
    members,
  };
}

export function publicUser(user: { id: string; email: string; name: string; role: UserPublic["role"]; createdAt: string }): UserPublic {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}
