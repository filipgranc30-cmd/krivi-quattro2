import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getUpcomingTournaments } from "@/lib/server/rundapikada";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = pendingBlock(await currentUser());
  if (blocked) return blocked;
  const feed = await getUpcomingTournaments();
  if (!feed.ok) return Response.json({ ok: false, error: "Trenutno nije moguće učitati turnire." });
  return Response.json({ ok: true, tournaments: feed.tournaments });
}
