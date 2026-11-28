import { currentUser, pendingBlock } from "@/lib/server/auth";
import { createWeeklyBackup } from "@/lib/server/backup";
import { isCronRequest, syncPdc } from "@/lib/server/pdc";
import { isSundayInZagreb } from "@/lib/shared/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronRequest(request)) return Response.json({ ok: false, error: "Nije dozvoljeno." }, { status: 401 });
  let sync: Awaited<ReturnType<typeof syncPdc>>;
  try {
    sync = await syncPdc({ force: false });
  } catch {
    sync = { ok: false, message: "PDC sinkronizacija nije uspjela." };
  }
  if (!isSundayInZagreb()) return Response.json(sync);
  try {
    const backup = await createWeeklyBackup();
    return Response.json({ ...sync, backup });
  } catch {
    return Response.json({ ...sync, backup: { ok: false, message: "Kopija nije uspjela." } });
  }
}

export async function POST(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  if (body.force && actor.role !== "admin") return Response.json({ ok: false, error: "Samo admin može prisilno sinkronizirati." }, { status: 403 });
  return Response.json(await syncPdc({ force: body.force === true }));
}
