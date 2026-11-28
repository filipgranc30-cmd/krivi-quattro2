import { currentUser, pendingBlock } from "@/lib/server/auth";
import { deleteReceipt, putReceipt } from "@/lib/server/receipt-store";
import { isSharedMode } from "@/lib/server/redis";
import { updateDb } from "@/lib/server/store";
import { applyAction, publicUser, toPublic } from "@/lib/shared/mutate";
import { isTreasurer } from "@/lib/shared/blagajna";
import { decodeProofJpeg, PROOF_ID } from "@/lib/shared/proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const actor = await requireAdmin();
  if (actor instanceof Response) return actor;
  const body = (await request.json().catch(() => null)) as { id?: unknown; image?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const image = typeof body?.image === "string" ? body.image : "";
  if (!PROOF_ID.test(id)) return Response.json({ ok: false, error: "Nepoznat unos." }, { status: 400, headers: noStore });
  if (!decodeProofJpeg(image)) return Response.json({ ok: false, error: "Slika mora biti JPEG do 250 KB." }, { status: 400, headers: noStore });
  const cleaned = image.replace(/^data:image\/jpeg;base64,/i, "").replace(/\s/g, "");
  try {
    await putReceipt(id, cleaned);
  } catch {
    return Response.json({ ok: false, error: "Račun nije spremljen." }, { status: 500, headers: noStore });
  }
  let error: string | undefined;
  const db = await updateDb((current) => {
    const result = applyAction(current, actor, { op: "setLedgerReceipt", id, hasReceipt: true });
    error = result.error;
    return result.error ? current : result.db;
  });
  if (error) {
    await deleteReceipt(id).catch(() => undefined);
    return Response.json({ ok: false, error }, { status: 400, headers: noStore });
  }
  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json({ ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) }, { headers: noStore });
}

export async function DELETE(request: Request) {
  const actor = await requireAdmin();
  if (actor instanceof Response) return actor;
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!PROOF_ID.test(id)) return Response.json({ ok: false, error: "Nepoznat unos." }, { status: 400, headers: noStore });
  await deleteReceipt(id);
  let error: string | undefined;
  const db = await updateDb((current) => {
    const result = applyAction(current, actor, { op: "setLedgerReceipt", id, hasReceipt: false });
    error = result.error;
    return result.error ? current : result.db;
  });
  if (error) return Response.json({ ok: false, error }, { status: 400, headers: noStore });
  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json({ ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) }, { headers: noStore });
}

async function requireAdmin() {
  if (!isSharedMode()) return Response.json({ ok: false, mode: "local" }, { status: 409, headers: noStore });
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401, headers: noStore });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  if (!isTreasurer(actor)) return Response.json({ ok: false, error: "Samo Filip može mijenjati blagajnu." }, { status: 403, headers: noStore });
  return actor;
}
