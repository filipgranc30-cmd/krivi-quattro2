import { currentUser, pendingBlock } from "@/lib/server/auth";
import { isSharedMode } from "@/lib/server/redis";
import { updateDb } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSharedMode()) return Response.json({ ok: false }, { status: 409 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const blocked = pendingBlock(user);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return Response.json({ ok: false, error: "Pretplata nije potpuna." }, { status: 400 });
  }
  await updateDb((db) => {
    db.pushSubs = db.pushSubs.filter((sub) => sub.endpoint !== body.endpoint);
    db.pushSubs.push({
      userId: user.id,
      endpoint: body.endpoint!,
      p256dh: body.keys!.p256dh!,
      auth: body.keys!.auth!,
    });
    if (db.pushSubs.length > 400) db.pushSubs = db.pushSubs.slice(-400);
    return db;
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSharedMode()) return Response.json({ ok: true });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const blocked = pendingBlock(user);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  await updateDb((db) => {
    db.pushSubs = db.pushSubs.filter((sub) => !(sub.userId === user.id && (!body?.endpoint || sub.endpoint === body.endpoint)));
    return db;
  });
  return Response.json({ ok: true });
}
