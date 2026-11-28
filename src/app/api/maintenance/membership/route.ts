import { createWeeklyBackup } from "@/lib/server/backup";
import { isCronRequest } from "@/lib/server/pdc";
import { updateDb } from "@/lib/server/store";
import { applyMembershipFixes } from "@/lib/shared/membership";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };

/** One-shot club data fix: backup, drop the zapisnik test account, mark Marko honorary. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return Response.json({ ok: false, error: "Nije dozvoljeno." }, { status: 401, headers: noStore });
  const backup = await createWeeklyBackup(new Date(), { force: true });
  if (!backup.ok) return Response.json({ ok: false, backup }, { status: 500, headers: noStore });
  let removed = 0;
  let markoHonorary = false;
  await updateDb((current) => {
    const result = applyMembershipFixes(current);
    removed = result.removed;
    markoHonorary = result.markoHonorary;
    return result.changed ? result.db : current;
  });
  return Response.json({ ok: true, backup: { name: backup.name, bytes: backup.bytes, keyCount: backup.keyCount }, removed, markoHonorary }, { headers: noStore });
}
