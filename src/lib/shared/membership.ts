import type { Db } from "./types";
import { normName } from "./util";

const TEST_ACCOUNT = normName("Provjera Zapisnika");
const HONORARY_MEMBER = normName("Marko Jambrišak");

export function applyMembershipFixes(db: Db): { db: Db; changed: boolean; removed: number; markoHonorary: boolean } {
  const removedUsers = db.users.filter((user) => normName(user.name) === TEST_ACCOUNT);
  const removedIds = new Set(removedUsers.map((user) => user.id));
  let users = db.users;
  let changed = false;
  if (removedIds.size) {
    users = db.users.filter((user) => !removedIds.has(user.id));
    changed = true;
  }
  users = users.map((user) => {
    if (normName(user.name) !== HONORARY_MEMBER || user.honorary != null) return user;
    changed = true;
    return { ...user, honorary: true };
  });
  const markoHonorary = users.some((user) => normName(user.name) === HONORARY_MEMBER && user.honorary === true);
  if (!changed) return { db, changed: false, removed: 0, markoHonorary };
  const drop = (id?: string) => Boolean(id && removedIds.has(id));
  return {
    changed: true,
    removed: removedIds.size,
    markoHonorary,
    db: {
      ...db,
      users,
      sessions: db.sessions.filter((item) => !drop(item.userId)),
      attendance: db.attendance.filter((item) => !drop(item.userId)),
      notifications: db.notifications.filter((item) => !drop(item.userId)),
      pushSubs: db.pushSubs.filter((item) => !drop(item.userId)),
      roster: db.roster.filter((player) => normName(player.name) !== TEST_ACCOUNT),
      games: db.games
        .map((game) => ({
          ...game,
          players: game.players.filter((player) => !drop(player.userId) && normName(player.name) !== TEST_ACCOUNT),
        }))
        .filter((game) => game.players.length > 0),
      dailyDarts: {
        ...db.dailyDarts,
        picks: db.dailyDarts.picks.filter((pick) => !drop(pick.userId)),
      },
      treasury: {
        ...db.treasury,
        dues: db.treasury.dues.filter((item) => !drop(item.userId)),
        entries: db.treasury.entries.filter((item) => !drop(item.dueUserId) && !drop(item.donorUserId)),
      },
    },
  };
}
