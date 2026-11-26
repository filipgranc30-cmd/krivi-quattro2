import { destroySession } from "@/lib/server/auth";
import { isSharedMode } from "@/lib/server/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (isSharedMode()) await destroySession();
  return Response.json({ ok: true });
}
