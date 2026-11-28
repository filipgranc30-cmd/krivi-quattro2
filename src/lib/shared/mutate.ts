import { dueAccount, dueAmount, dueEntryMatch, isLedgerCategory, isSeasonMonth, isTreasurer, monthLabel, normalizeTreasury, roundEur, treasuryBalance } from "./blagajna";
import { todayZagreb } from "./dates";
import { applyDailyAction, cloneDailyDarts, publicDailyDarts } from "./daily-darts";
import { PROOF_ID } from "./proof";
import type { Action, AppData, Db, Member, NotificationItem, StoredUser, UserPublic } from "./types";
import { accountStatus } from "./types";
import { clampText, firstName, normName, uid } from "./util";

export type MutateResult = {
  db: Db;
  error?: string;
  push?: { title: string; body: string; url: string; userIds?: string[] };
};

function sanitizeLedger(input: { date: string; amount: number; direction: string; account: string; category: string; description: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) return null;
  if (input.direction !== "income" && input.direction !== "expense") return null;
  if (input.account !== "cash" && input.account !== "bank") return null;
  if (!isLedgerCategory(input.category)) return null;
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 100000) return null;
  const description = clampText(input.description || "", 160);
  if (description.length < 2) return null;
  const category = input.category;
  const account = category === "stash" || category === "renta" ? "cash" : category === "racun" ? "bank" : input.account;
  return {
    date: input.date,
    amount: roundEur(input.amount),
    direction: input.direction as "income" | "expense",
    account: account as "cash" | "bank",
    category,
    description,
  };
}

function validDue(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 500;
}

function requireAdmin(actor: UserPublic): string | null {
  return actor.role === "admin" ? null : "Samo trener ili admin može mijenjati ove podatke.";
}

function requireTreasurer(actor: UserPublic): string | null {
  return isTreasurer(actor) ? null : "Samo Filip može mijenjati blagajnu.";
}

function trimNotifications(db: Db) {
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

function notifyUsers(db: Db, userIds: string[], title: string, body: string, href: string) {
  const now = new Date().toISOString();
  const allow = new Set(userIds);
  for (const userId of allow) {
    db.notifications.push({ id: uid(), userId, title, body, href, createdAt: now, read: false });
  }
  trimNotifications(db);
}

function notifyOthers(db: Db, actor: UserPublic, title: string, body: string, href: string) {
  notifyUsers(
    db,
    db.users.filter((user) => user.id !== actor.id && accountStatus(user) === "active").map((user) => user.id),
    title,
    body,
    href,
  );
}

export function notifyAdmins(db: Db, title: string, body: string, href: string) {
  notifyUsers(
    db,
    db.users.filter((user) => user.role === "admin" && accountStatus(user) === "active").map((user) => user.id),
    title,
    body,
    href,
  );
}

export function registerAccount(
  db: Db,
  input: { id: string; email: string; name: string; passwordHash: string; adminEmail: string | null },
): StoredUser {
  const autoAdmin = db.users.length === 0 || Boolean(input.adminEmail && input.email === input.adminEmail);
  const user: StoredUser = {
    id: input.id,
    email: input.email,
    name: input.name,
    role: autoAdmin ? "admin" : "member",
    status: autoAdmin ? "active" : "pending",
    createdAt: new Date().toISOString(),
    passwordHash: input.passwordHash,
  };
  db.users.push(user);
  if (user.status === "pending") {
    notifyAdmins(db, "Registracija", `Novi zahtjev za registraciju: ${user.name}`, "/vise");
  }
  return user;
}

function adminCount(db: Db): number {
  return db.users.filter((user) => user.role === "admin").length;
}

export function applyAction(db: Db, actor: UserPublic, action: Action): MutateResult {
  if (accountStatus(actor) === "pending") {
    return { db, error: "Čeka odobrenje admina." };
  }
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
    dailyDarts: cloneDailyDarts(db.dailyDarts),
    treasury: normalizeTreasury(db.treasury),
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
        const href = action.kind === "training" ? "/trening/dolasci" : "/dashboard";
        notifyOthers(next, actor, "Dolazak", body, href);
        push = { title: "Krivi Quattro", body, url: href };
      }
      return { db: next, push };
    }
    case "clearAttendance": {
      const targetId = clampText(action.targetId, 160);
      if (!targetId) return { db, error: "Nedostaje događaj." };
      if (action.kind !== "match" && action.kind !== "training") return { db, error: "Nepoznat događaj." };
      next.attendance = next.attendance.filter(
        (item) => !(item.userId === actor.id && item.kind === action.kind && item.targetId === targetId),
      );
      return { db: next };
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
      const requested = action.game.id && PROOF_ID.test(action.game.id) ? action.game.id : uid();
      if (next.games.some((item) => item.id === requested)) return { db, error: "Igra je već spremljena." };
      next.games.push({
        id: requested,
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
    case "setDueAmounts": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      if (!validDue(action.renta) || !validDue(action.bank)) return { db, error: "Iznos nije ispravan." };
      next.treasury.rentaAmount = roundEur(action.renta);
      next.treasury.bankAmount = roundEur(action.bank);
      return { db: next };
    }
    case "toggleDue": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      if (action.kind !== "renta" && action.kind !== "racun") return { db, error: "Nepoznata uplata." };
      if (!isSeasonMonth(action.month)) return { db, error: "Nepoznat mjesec sezone." };
      const member = next.users.find((user) => user.id === action.userId && accountStatus(user) === "active");
      if (!member) return { db, error: "Član nije pronađen." };
      const paid = next.treasury.dues.some((item) => item.userId === action.userId && item.month === action.month && item.kind === action.kind);
      if (paid) {
        next.treasury.dues = next.treasury.dues.filter((item) => !(item.userId === action.userId && item.month === action.month && item.kind === action.kind));
        next.treasury.entries = next.treasury.entries.filter((item) => !dueEntryMatch(item, action.userId, action.month, action.kind));
      } else {
        const now = new Date().toISOString();
        const label = action.kind === "renta" ? "Renta aparata" : "Uplata na račun";
        next.treasury.dues.push({
          userId: action.userId,
          month: action.month,
          kind: action.kind,
          paidAt: now,
          enteredById: actor.id,
          enteredByName: actor.name,
        });
        next.treasury.entries.push({
          id: uid(),
          date: todayZagreb(),
          amount: dueAmount(next.treasury, action.kind),
          direction: "income",
          account: dueAccount(action.kind),
          category: action.kind,
          description: `${label}, ${member.name}, ${monthLabel(action.month)}`,
          createdById: actor.id,
          createdByName: actor.name,
          createdAt: now,
          source: "dues",
          dueUserId: action.userId,
          dueMonth: action.month,
          dueKind: action.kind,
        });
      }
      return { db: next };
    }
    case "addStash": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.date || "")) return { db, error: "Datum nije ispravan." };
      if (!Number.isFinite(action.amount) || action.amount <= 0 || action.amount > 100000) return { db, error: "Iznos nije ispravan." };
      const donor = action.donorUserId ? next.users.find((user) => user.id === action.donorUserId && accountStatus(user) === "active") : undefined;
      if (action.donorUserId && !donor) return { db, error: "Član nije pronađen." };
      const id = action.id && PROOF_ID.test(action.id) ? action.id : uid();
      if (next.treasury.entries.some((item) => item.id === id)) return { db, error: "Unos je već spremljen." };
      next.treasury.entries.push({
        id,
        date: action.date,
        amount: roundEur(action.amount),
        direction: "income",
        account: "cash",
        category: "stash",
        description: donor ? `Dobrovoljni stash, ${donor.name}` : "Dobrovoljni stash, anonimno",
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: new Date().toISOString(),
        source: "stash",
        donorUserId: donor?.id,
        donorName: donor?.name,
      });
      return { db: next };
    }
    case "setBalance": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      if (action.account !== "cash" && action.account !== "bank") return { db, error: "Nepoznat račun." };
      if (!Number.isFinite(action.amount) || Math.abs(action.amount) > 1000000) return { db, error: "Iznos nije ispravan." };
      const target = roundEur(action.amount);
      const current = action.account === "cash" ? treasuryBalance(next.treasury).cash : treasuryBalance(next.treasury).bank;
      const delta = roundEur(target - current);
      const now = new Date().toISOString();
      next.treasury.entries.push({
        id: uid(),
        date: todayZagreb(),
        amount: Math.abs(delta),
        direction: delta < 0 ? "expense" : "income",
        account: action.account,
        category: "korekcija",
        description: action.account === "cash" ? "Usklađenje gotovine" : "Usklađenje računa udruge",
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: now,
        source: "balance",
      });
      return { db: next };
    }
    case "addLedger": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      const entry = sanitizeLedger(action.entry);
      if (!entry) return { db, error: "Unos blagajne nije ispravan." };
      const id = action.entry.id && PROOF_ID.test(action.entry.id) ? action.entry.id : uid();
      if (next.treasury.entries.some((item) => item.id === id)) return { db, error: "Unos je već spremljen." };
      next.treasury.entries.push({
        ...entry,
        id,
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: new Date().toISOString(),
        source: "manual",
      });
      return { db: next };
    }
    case "updateLedger": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      const current = next.treasury.entries.find((item) => item.id === action.entry.id);
      if (!current) return { db, error: "Unos nije pronađen." };
      if (current.source === "dues" || current.source === "stash" || current.source === "balance") return { db, error: "Ovaj unos mijenjaj u njegovom odjeljku." };
      const entry = sanitizeLedger(action.entry);
      if (!entry) return { db, error: "Unos blagajne nije ispravan." };
      current.date = entry.date;
      current.amount = entry.amount;
      current.direction = entry.direction;
      current.account = entry.account;
      current.category = entry.category;
      current.description = entry.description;
      return { db: next };
    }
    case "deleteLedger": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      const current = next.treasury.entries.find((item) => item.id === action.id);
      if (!current) return { db, error: "Unos nije pronađen." };
      if (current.source === "dues" && current.dueUserId && current.dueMonth && current.dueKind) {
        next.treasury.dues = next.treasury.dues.filter((item) => !(item.userId === current.dueUserId && item.month === current.dueMonth && item.kind === current.dueKind));
      }
      next.treasury.entries = next.treasury.entries.filter((item) => item.id !== action.id);
      return { db: next };
    }
    case "setLedgerReceipt": {
      const denied = requireTreasurer(actor);
      if (denied) return { db, error: denied };
      if (!PROOF_ID.test(action.id)) return { db, error: "Nepoznat unos." };
      const entry = next.treasury.entries.find((item) => item.id === action.id);
      if (!entry) return { db, error: "Unos nije pronađen." };
      if (action.hasReceipt) {
        entry.hasReceipt = true;
        if (!entry.receiptUserId) entry.receiptUserId = actor.id;
        entry.receiptRev = (entry.receiptRev ?? 0) + 1;
      } else if (entry.hasReceipt) {
        entry.hasReceipt = false;
        delete entry.receiptUserId;
        entry.receiptRev = (entry.receiptRev ?? 0) + 1;
      }
      return { db: next };
    }
    case "setGameProof": {
      if (!PROOF_ID.test(action.id)) return { db, error: "Nepoznat rezultat." };
      const game = next.games.find((item) => item.id === action.id);
      if (!game || game.type !== "highscore") return { db, error: "Rezultat nije pronađen." };
      const owns = !game.proofUserId || game.proofUserId === actor.id;
      if (action.hasProof) {
        if (game.hasProof && !owns && actor.role !== "admin") {
          return { db, error: "Samo autor slike ili admin može zamijeniti dokaz." };
        }
        game.hasProof = true;
        if (!game.proofUserId) game.proofUserId = actor.id;
        game.proofRev = (game.proofRev ?? 0) + 1;
      } else if (game.hasProof) {
        if (!owns && actor.role !== "admin") {
          return { db, error: "Samo autor slike ili admin može obrisati dokaz." };
        }
        game.hasProof = false;
        delete game.proofUserId;
        game.proofRev = (game.proofRev ?? 0) + 1;
      }
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
      if (accountStatus(user) === "pending") return { db, error: "Prvo odobri pristup." };
      if (action.role !== "admin" && action.role !== "member") return { db, error: "Nepoznata uloga." };
      if (user.role === "admin" && action.role !== "admin" && adminCount(next) <= 1) {
        return { db, error: "Mora ostati barem jedan admin." };
      }
      user.role = action.role;
      return { db: next };
    }
    case "approveUser": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const user = next.users.find((item) => item.id === action.userId);
      if (!user || accountStatus(user) !== "pending") return { db, error: "Nema takvog zahtjeva." };
      user.status = "active";
      user.role = "member";
      const body = "Tvoj zahtjev za pristup je odobren.";
      notifyUsers(next, [user.id], "Pristup", body, "/dashboard");
      return { db: next, push: { title: "Krivi Quattro", body, url: "/dashboard", userIds: [user.id] } };
    }
    case "dailySetPlayers":
    case "dailyUpsertDay":
    case "dailyDeleteDay":
    case "dailyUpsertMatch":
    case "dailyDeleteMatch":
    case "dailySetStats":
    case "dailySetPicks":
    case "dailySetScoring":
    case "dailySetTournament": {
      const result = applyDailyAction(next.dailyDarts, actor, action, actor.role === "admin");
      if (result.error) return { db, error: result.error };
      next.dailyDarts = result.state;
      return { db: next };
    }
    case "rejectUser": {
      const denied = requireAdmin(actor);
      if (denied) return { db, error: denied };
      const user = next.users.find((item) => item.id === action.userId);
      if (!user || accountStatus(user) !== "pending") return { db, error: "Nema takvog zahtjeva." };
      next.users = next.users.filter((item) => item.id !== user.id);
      next.sessions = next.sessions.filter((item) => item.userId !== user.id);
      next.pushSubs = next.pushSubs.filter((item) => item.userId !== user.id);
      next.notifications = next.notifications.filter((item) => item.userId !== user.id);
      next.attendance = next.attendance.filter((item) => item.userId !== user.id);
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
  const isAdmin = viewer?.role === "admin" && accountStatus(viewer) === "active";
  const members: Member[] = db.users
    .filter((user) => accountStatus(user) === "active")
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      status: "active" as const,
      createdAt: user.createdAt,
      email: isAdmin ? user.email : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "hr"));
  const pendingRequests: Member[] = isAdmin
    ? db.users
        .filter((user) => accountStatus(user) === "pending")
        .map((user) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          status: "pending" as const,
          createdAt: user.createdAt,
          email: user.email,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];
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
    pendingRequests,
    dailyDarts: publicDailyDarts(db.dailyDarts, viewer),
    treasury: normalizeTreasury(db.treasury),
  };
}

export function publicUser(user: { id: string; email: string; name: string; role: UserPublic["role"]; status?: UserPublic["status"] | null; createdAt: string }): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: accountStatus(user),
    createdAt: user.createdAt,
  };
}
