import { currentUser, pendingBlock } from "@/lib/server/auth";
import { deleteProof } from "@/lib/server/proof-store";
import { sendPush } from "@/lib/server/push";
import { isSharedMode } from "@/lib/server/redis";
import { updateDb } from "@/lib/server/store";
import { applyAction, publicUser, toPublic, type MutateResult } from "@/lib/shared/mutate";
import type { Action } from "@/lib/shared/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSharedMode()) return Response.json({ ok: false, mode: "local" }, { status: 409 });
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  const action = (await request.json().catch(() => null)) as Action | null;
  if (!action || typeof action !== "object" || !("op" in action)) {
    return Response.json({ ok: false, error: "Nepoznata radnja." }, { status: 400 });
  }
  if (action.op === "setGameProof") {
    return Response.json({ ok: false, error: "Slika ide posebnom spremom." }, { status: 400 });
  }
  let error: string | undefined;
  let push: MutateResult["push"];
  const droppedProofs: string[] = [];
  const db = await updateDb((current) => {
    droppedProofs.length = 0;
    const before = current.games.filter((game) => game.hasProof).map((game) => game.id);
    const result = applyAction(current, actor, action);
    error = result.error;
    push = result.push;
    if (result.error) return current;
    const after = new Set(result.db.games.map((game) => game.id));
    for (const id of before) if (!after.has(id)) droppedProofs.push(id);
    return result.db;
  });
  if (error) return Response.json({ ok: false, error }, { status: 400 });
  if (droppedProofs.length) await Promise.all(droppedProofs.map((id) => deleteProof(id).catch(() => undefined)));
  if (push) await sendPush(db, actor.id, push, push.userIds);
  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json(
    { ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
