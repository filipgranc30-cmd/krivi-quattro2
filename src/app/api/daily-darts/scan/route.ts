import { createGateway, generateObject } from "ai";
import { z } from "zod";
import { currentUser, pendingBlock } from "@/lib/server/auth";
import { alignSheet, type ScannedSheet } from "@/lib/shared/stat-scan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 4.5 * 1024 * 1024;
const MODEL = "google/gemini-2.5-flash";

const sideSchema = z.object({
  average: z.number(),
  count180: z.number(),
  count140: z.number(),
  count100: z.number(),
  checkoutHits: z.number(),
  checkoutAttempts: z.number(),
  checkoutOver100: z.number(),
  highestCheckout: z.number(),
});

const sheetSchema = z.object({
  leftName: z.string(),
  rightName: z.string(),
  leftScore: z.number().nullable(),
  rightScore: z.number().nullable(),
  left: sideSchema,
  right: sideSchema,
});

async function gatewayToken(): Promise<string | null> {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  if (process.env.VERCEL_OIDC_TOKEN) return process.env.VERCEL_OIDC_TOKEN;
  try {
    const oidc = await import("@vercel/oidc");
    const token = await oidc.getVercelOidcToken();
    return token || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(actor);
  if (blocked) return blocked;
  if (actor.role !== "admin") return Response.json({ ok: false, error: "Samo admin može učitati sliku." }, { status: 403 });

  const token = await gatewayToken();
  if (!token) {
    return Response.json(
      {
        ok: false,
        error: "Čitanje slike treba Vercel AI Gateway. U projektu dodaj env varijablu AI_GATEWAY_API_KEY (Vercel → AI Gateway → API Keys, Production i Preview). OIDC token (VERCEL_OIDC_TOKEN) nije dostupan u ovom okruženju.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  const playerA = String(form?.get("playerA") ?? "");
  const playerB = String(form?.get("playerB") ?? "");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "Nema slike." }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ ok: false, error: "Datoteka mora biti slika." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ ok: false, error: "Slika je prevelika. Najviše je 4,5 MB." }, { status: 413 });

  try {
    const gateway = createGateway({ apiKey: token });
    const { object } = await generateObject({
      model: gateway(MODEL),
      schema: sheetSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "This is a screenshot of a darts match Statistika tab on rezultati.com.",
                "Header looks like 'Manby C. 4-6 Schindler M.' Left player is the left name, right player is the right name.",
                "Read both columns. Left values belong to the left player, right values to the right player.",
                "Rows: Prosjek (3 strelice) decimal, Bacanja od 180, Bacanja od 140+, Bacanja od 100+, Izlazi as hits/attempts from text like '50% (4/8)' or '(6/15) 40%', Izlazi 100+, Najveći izlaz (0-170).",
                "Scores in the header are the match score, not a stat. If a cell is missing use 0. Do not invent players.",
              ].join(" "),
            },
            { type: "file", data: new Uint8Array(await file.arrayBuffer()), mediaType: file.type || "image/jpeg" },
          ],
        },
      ],
    });
    const sheet = object as ScannedSheet;
    const aligned = alignSheet(playerA, playerB, sheet);
    return Response.json({ ok: true, ...aligned, leftName: sheet.leftName, rightName: sheet.rightName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauth|api key|oidc|401/i.test(message)) {
      return Response.json(
        { ok: false, error: "AI Gateway nije prihvatio prijavu. Dodaj AI_GATEWAY_API_KEY u Vercel env (Production i Preview)." },
        { status: 503 },
      );
    }
    return Response.json({ ok: false, error: "Sliku nisam uspio pročitati. Upiši brojke ručno." }, { status: 422 });
  }
}
