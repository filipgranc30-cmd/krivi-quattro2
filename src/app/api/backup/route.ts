import { currentUser, pendingBlock } from "@/lib/server/auth";
import { blobConfigured, createWeeklyBackup, listBackups } from "@/lib/server/backup";
import { isCronRequest } from "@/lib/server/pdc";
import { isSharedMode } from "@/lib/server/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const allowed = await allow(request);
  if (allowed) return allowed;
  if (!blobConfigured()) return Response.json({ ok: true, items: [], message: "Spremište kopija nije spojeno." }, { headers: noStore });
  const items = await listBackups();
  return Response.json({ ok: true, items }, { headers: noStore });
}

export async function POST(request: Request) {
  const allowed = await allow(request);
  if (allowed) return allowed;
  const result = await createWeeklyBackup();
  return Response.json(result, { status: result.ok ? 200 : 500, headers: noStore });
}

async function allow(request: Request): Promise<Response | null> {
  if (isCronRequest(request)) return null;
  if (!isSharedMode()) return Response.json({ ok: false, error: "Dijeljena baza nije spojena." }, { status: 409, headers: noStore });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401, headers: noStore });
  const blocked = pendingBlock(user);
  if (blocked) return blocked;
  if (user.role !== "admin") return Response.json({ ok: false, error: "Samo admin može vidjeti kopije." }, { status: 403, headers: noStore });
  return null;
}
