import { currentUser, pendingBlock } from "@/lib/server/auth";
import { sendPush } from "@/lib/server/push";
import { isSharedMode } from "@/lib/server/redis";
import { updateDb } from "@/lib/server/store";
import { cloneDailyDarts, isDayLocked, lockInstant } from "@/lib/shared/daily-darts";
import { accountStatus } from "@/lib/shared/types";
import { uid } from "@/lib/shared/util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isSharedMode()) return Response.json({ ok: true, skipped: true });
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  const now = Date.now();
  let push: { title: string; body: string; url: string; userIds: string[] } | undefined;
  const db = await updateDb((current) => {
    const daily = cloneDailyDarts(current.dailyDarts);
    for (const day of daily.days) {
      if (daily.reminderSent.includes(day.id) || isDayLocked(day, new Date(now))) continue;
      const lock = new Date(lockInstant(day)).getTime();
      if (!lock || now < lock - 60 * 60 * 1000) continue;
      const picked = new Set(daily.picks.filter((item) => item.dayId === day.id).map((item) => item.userId));
      const missing = current.users.filter((user) => accountStatus(user) === "active" && !picked.has(user.id)).map((user) => user.id);
      const body = "Za sat vremena se zaključava odabir. Odaberi 4 igrača.";
      if (missing.length) {
        const createdAt = new Date().toISOString();
        for (const userId of missing) {
          current.notifications.push({ id: uid(), userId, title: "Daily Darts", body, href: "/daily-darts", createdAt, read: false });
        }
        push = { title: "Daily Darts", body, url: "/daily-darts", userIds: missing };
      }
      daily.reminderSent.push(day.id);
    }
    current.dailyDarts = daily;
    return current;
  });
  if (push) await sendPush(db, "", push, push.userIds);
  return Response.json({ ok: true });
}
