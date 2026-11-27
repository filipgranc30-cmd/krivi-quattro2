import { currentUser, pendingBlock } from "@/lib/server/auth";
import { isCronRequest, syncPdc } from "@/lib/server/pdc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronRequest(request)) return Response.json({ ok: false, error: "Nije dozvoljeno." }, { status: 401 });
  return Response.json(await syncPdc({ force: false }));
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
