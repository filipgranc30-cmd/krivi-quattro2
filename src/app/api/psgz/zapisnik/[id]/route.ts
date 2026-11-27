import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getZapisnik, validZapisnikId } from "@/lib/server/zapisnik";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = pendingBlock(await currentUser());
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!validZapisnikId(id)) return Response.json({ ok: false, error: "Nepoznat zapisnik." }, { status: 400 });
  try {
    const report = await getZapisnik(id);
    return Response.json({ ok: true, report });
  } catch {
    return Response.json({ ok: false, error: "Zapisnik trenutno nije dostupan." });
  }
}
