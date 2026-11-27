import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getLeagueIndex } from "@/lib/server/psgz";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = pendingBlock(await currentUser());
  if (blocked) return blocked;
  try {
    const leagues = await getLeagueIndex();
    return Response.json({ ok: true, leagues });
  } catch {
    return Response.json({ ok: false, error: "Popis liga s psgz.hr trenutno nije dostupan." });
  }
}
