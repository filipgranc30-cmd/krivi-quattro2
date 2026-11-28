import { currentUser, pendingBlock } from "@/lib/server/auth";
import { deleteProof } from "@/lib/server/proof-store";
import { deleteReceipt } from "@/lib/server/receipt-store";
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
  if (action.op === "setGameProof" || action.op === "setLedgerReceipt") {
    return Response.json({ ok: false, error: "Slika ide posebnom spremom." }, { status: 400 });
  }
  let error: string | undefined;
  let push: MutateResult["push"];
  const droppedProofs: string[] = [];
  const droppedReceipts: string[] = [];
  const db = await updateDb((current) => {
    droppedProofs.length = 0;
    droppedReceipts.length = 0;
    const beforeProofs = current.games.filter((game) => game.hasProof).map((game) => game.id);
    const beforeReceipts = (current.treasury?.entries ?? []).filter((entry) => entry.hasReceipt).map((entry) => entry.id);
    const result = applyAction(current, actor, action);
    error = result.error;
    push = result.push;
    if (result.error) return current;
    const afterProofs = new Set(result.db.games.map((game) => game.id));
    const afterReceipts = new Set(result.db.treasury.entries.map((entry) => entry.id));
    for (const id of beforeProofs) if (!afterProofs.has(id)) droppedProofs.push(id);
    for (const id of beforeReceipts) if (!afterReceipts.has(id)) droppedReceipts.push(id);
    return result.db;
  });
  if (error) return Response.json({ ok: false, error }, { status: 400 });
  if (droppedProofs.length) await Promise.all(droppedProofs.map((id) => deleteProof(id).catch(() => undefined)));
  if (droppedReceipts.length) await Promise.all(droppedReceipts.map((id) => deleteReceipt(id).catch(() => undefined)));
  if (push) await sendPush(db, actor.id, push, push.userIds);
  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json(
    { ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
