import webpush from "web-push";
import type { Db } from "../shared/types";

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function pushConfigured(): boolean {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPush(db: Db, actorId: string, payload: { title: string; body: string; url: string }) {
  if (!pushConfigured()) return;
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  const subject = process.env.VAPID_SUBJECT || "mailto:psgz@psgz.hr";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    return;
  }
  const targets = db.pushSubs.filter((sub) => sub.userId !== actorId);
  await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch {
        // Expired subscriptions are ignored; the next subscribe refreshes them.
      }
    }),
  );
}
