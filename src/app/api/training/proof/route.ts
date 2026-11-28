import { currentUser, pendingBlock } from "@/lib/server/auth";
import { deleteProof, putProof } from "@/lib/server/proof-store";
import { isSharedMode } from "@/lib/server/redis";
import { readDb, updateDb } from "@/lib/server/store";
import { applyAction, publicUser, toPublic } from "@/lib/shared/mutate";
import { decodeProofJpeg, PROOF_ID } from "@/lib/shared/proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const actor = await requireUser();
  if (actor instanceof Response) return actor;
  const body = (await request.json().catch(() => null)) as { id?: unknown; image?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const image = typeof body?.image === "string" ? body.image : "";
  if (!PROOF_ID.test(id)) return Response.json({ ok: false, error: "Nepoznat rezultat." }, { status: 400, headers: noStore });
  const jpeg = decodeProofJpeg(image);
  if (!jpeg) return Response.json({ ok: false, error: "Slika mora biti JPEG do 250 KB." }, { status: 400, headers: noStore });

  const before = await readDb();
  const game = before.games.find((item) => item.id === id);
  if (!game || game.type !== "highscore") {
    return Response.json({ ok: false, error: "Rezultat nije pronađen." }, { status: 404, headers: noStore });
  }
  const owns = !game.proofUserId || game.proofUserId === actor.id;
  if (game.hasProof && !owns && actor.role !== "admin") {
    return Response.json({ ok: false, error: "Samo autor slike ili admin može zamijeniti dokaz." }, { status: 403, headers: noStore });
  }
  const previous = { hasProof: game.hasProof, proofUserId: game.proofUserId, proofRev: game.proofRev };

  let error: string | undefined;
  let rev = 0;
  const db = await updateDb((current) => {
    const result = applyAction(current, actor, { op: "setGameProof", id, hasProof: true });
    error = result.error;
    if (result.error) return current;
    rev = result.db.games.find((item) => item.id === id)?.proofRev ?? 0;
    return result.db;
  });
  if (error) return Response.json({ ok: false, error }, { status: 400, headers: noStore });

  try {
    await putProof(id, image.replace(/^data:image\/jpeg;base64,/i, "").replace(/\s/g, ""));
  } catch {
    await updateDb((current) => {
      const item = current.games.find((gameItem) => gameItem.id === id);
      if (item && item.proofRev === rev) {
        item.hasProof = previous.hasProof;
        item.proofUserId = previous.proofUserId;
        item.proofRev = previous.proofRev;
      }
      return current;
    }).catch(() => undefined);
    return Response.json({ ok: false, error: "Slika nije spremljena." }, { status: 500, headers: noStore });
  }

  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json(
    { ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) },
    { headers: noStore },
  );
}

export async function DELETE(request: Request) {
  const actor = await requireUser();
  if (actor instanceof Response) return actor;
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!PROOF_ID.test(id)) return Response.json({ ok: false, error: "Nepoznat rezultat." }, { status: 400, headers: noStore });

  const before = await readDb();
  const game = before.games.find((item) => item.id === id);
  if (!game || game.type !== "highscore" || !game.hasProof) {
    return Response.json({ ok: false, error: "Nema dokaza." }, { status: 404, headers: noStore });
  }
  const owns = !game.proofUserId || game.proofUserId === actor.id;
  if (!owns && actor.role !== "admin") {
    return Response.json({ ok: false, error: "Samo autor slike ili admin može obrisati dokaz." }, { status: 403, headers: noStore });
  }

  await deleteProof(id);
  let error: string | undefined;
  const db = await updateDb((current) => {
    const result = applyAction(current, actor, { op: "setGameProof", id, hasProof: false });
    error = result.error;
    return result.error ? current : result.db;
  });
  if (error) return Response.json({ ok: false, error }, { status: 400, headers: noStore });
  const fresh = db.users.find((user) => user.id === actor.id);
  return Response.json(
    { ok: true, user: fresh ? publicUser(fresh) : actor, data: toPublic(db, fresh ? publicUser(fresh) : actor) },
    { headers: noStore },
  );
}

async function requireUser() {
  if (!isSharedMode()) return Response.json({ ok: false, mode: "local" }, { status: 409, headers: noStore });
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401, headers: noStore });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  return actor;
}
