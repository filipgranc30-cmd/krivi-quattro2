import { currentUser, pendingBlock } from "@/lib/server/auth";
import { readBackup } from "@/lib/server/backup";
import { isCronRequest } from "@/lib/server/pdc";
import { isSharedMode } from "@/lib/server/redis";
import { BACKUP_NAME } from "@/lib/shared/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  if (!isCronRequest(request)) {
    if (!isSharedMode()) return Response.json({ ok: false, error: "Dijeljena baza nije spojena." }, { status: 409 });
    const user = await currentUser();
    if (!user) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
    const blocked = pendingBlock(user);
    if (blocked) return blocked;
    if (user.role !== "admin") return Response.json({ ok: false, error: "Samo admin može preuzeti kopiju." }, { status: 403 });
  }
  const { name } = await context.params;
  if (!BACKUP_NAME.test(name)) return Response.json({ ok: false, error: "Nepoznata kopija." }, { status: 400 });
  const file = await readBackup(name);
  if (!file) return Response.json({ ok: false, error: "Kopija nije pronađena." }, { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": String(file.bytes),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
