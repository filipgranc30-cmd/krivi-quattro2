import { currentUser } from "@/lib/server/auth";
import { isSharedMode } from "@/lib/server/redis";
import { readDb } from "@/lib/server/store";
import { toPublic } from "@/lib/shared/mutate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isSharedMode()) return Response.json({ ok: false, mode: "local" }, { status: 409 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const db = await readDb();
  return Response.json({ ok: true, user, data: toPublic(db, user) });
}
