import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getLeague, getLeagueIndex } from "@/lib/server/psgz";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = pendingBlock(await currentUser());
  if (blocked) return blocked;
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > 99999) {
    return Response.json({ ok: false, error: "Nepoznata liga." }, { status: 400 });
  }
  try {
    const index = await getLeagueIndex();
    const meta = index.find((league) => league.id === id);
    const league = await getLeague(id, meta?.name || "");
    return Response.json({ ok: true, league });
  } catch {
    return Response.json({ ok: false, error: "Tablica s psgz.hr trenutno nije dostupna. Provjeri vezu ili otvori izvornu stranicu." });
  }
}
