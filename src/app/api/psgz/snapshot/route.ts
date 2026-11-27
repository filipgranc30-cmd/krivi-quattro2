import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getSnapshot } from "@/lib/server/psgz";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = pendingBlock(await currentUser());
  if (blocked) return blocked;
  try {
    const snapshot = await getSnapshot();
    return Response.json({ ok: true, snapshot });
  } catch {
    return Response.json({ ok: false, error: "Podaci s psgz.hr trenutno nisu dostupni. Prikazuju se ručni ili demo podaci." });
  }
}
