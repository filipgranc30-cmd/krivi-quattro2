import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getProof } from "@/lib/server/proof-store";
import { isSharedMode } from "@/lib/server/redis";
import { decodeProofJpeg, PROOF_ID } from "@/lib/shared/proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSharedMode()) return Response.json({ ok: false, mode: "local" }, { status: 409 });
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!PROOF_ID.test(id)) return Response.json({ ok: false, error: "Nepoznat rezultat." }, { status: 400 });
  const stored = await getProof(id);
  const bytes = stored ? decodeProofJpeg(stored) : null;
  if (!bytes) return Response.json({ ok: false, error: "Nema dokaza." }, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Content-Length": String(bytes.length),
    },
  });
}
