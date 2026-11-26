import { getSnapshot } from "@/lib/server/psgz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    return Response.json({ ok: true, snapshot });
  } catch {
    return Response.json({ ok: false, error: "Podaci s psgz.hr trenutno nisu dostupni. Prikazuju se ručni ili demo podaci." });
  }
}
